import fs from "fs";
import Parser from "tree-sitter";
import GrammarCPP from "tree-sitter-cpp";

import {error, nicePath, print} from "./logger.mjs";

const parser = new Parser();
parser.setLanguage(GrammarCPP);

export function parse(files, verbose) {
    const types = [];
    let errors = 0;

    for (const file of files) {
        const type = _parseFile(file, errors, verbose);

        if (type) {
            types.push(type);
        } else {
            errors++;
        }
    }
    return {types, errors: errors};
}

function _parseFile(path, errors, verbose) {
    try {
        const code = fs.readFileSync(path, {encoding: 'utf8'});
        const tree = parser.parse(code);
        const objects = _parseNodes(tree.rootNode);

        return {
            path: path,
            objects: objects
        };
    } catch (e) {
        if (errors === 0) {
            print('');
        }
        if (!verbose) {
            error(`Failed to parse file ${nicePath(path)}.`);
        } else {
            error(`Failed to parse file ${nicePath(path)}:`);
            error(e);
        }
        return null;
    }
}

function _parseNodes(node, parent) {
    const children = node.children;
    const objects = [];

    for (const child of children) {
        const object = _parseNode(child, parent);

        if (object && object instanceof Array) {
            objects.push(...object);
        } else if (object) {
            objects.push(object);
        }
    }
    return objects;
}

function _parseNode(node, parent) {
    switch (node.type) {
        case 'namespace_definition': {
            const it = _parseNamespace(node);
            const ns = it.data;
            const object = {};
            let objects = _parseNodes(it.next, object);

            objects = objects.filter(object => {
                if (object.type !== 'namespace') {
                    return true;
                }
                return object.objects.length > 0;
            });
            ns.objects.push(...objects);
            return ns;
        }
        // TODO: support templates on struct/class
        //       support enum class
        case 'struct_specifier':
        case 'class_specifier': {
            const it = _parseObject(node);

            if (it && parent) {
                for (const key of Object.keys(it.data)) {
                    parent[key] = it.data[key];
                }
                _parseNodes(it.next, parent);
                _cleanObject(it.data);
                return it.data;
            }
            break;
        }
        case 'declaration': {
            if (_isDtor(node, parent)) {
                _parseDtor(node, parent);
            } else if (_isCtor(node, parent)) {
                _parseCtor(node, parent);
            }
            break;
        }
        case 'field_declaration': {
            const defaultDecl = node.childForFieldName('default_value');

            if (defaultDecl) {
                _parseConstant(node, parent);
            }
            if (_isStructNested(node)) {
                const decl = node.childForFieldName('type');
                const object = _parseNode(decl, {});

                if (object) {
                    parent.nested.push(object);
                }
                break;
            }
            const decl = node.childForFieldName('declarator');

            if (_isMethod(decl)) {
                _parseMethod(node, parent);
            } else {
                _parseProperty(node, parent);
            }
            /*
            debug('what:');
            debug(decl);
            //*/
            break;
        }
        case 'function_declarator': {
            _parseMethod(node, parent);
            break;
        }
        case 'function_definition': {
            if (_isDtor(node, parent)) {
                _parseDtor(node, parent);
            } else if (_isMethod(node)) {
                _parseMethod(node, parent);
            }
            break;
        }
        default: {
            /*
            debug('unknown:');
            debug(node);
            debug(node.text);
            //*/
            break;
        }
    }
}

function _parseNamespace(node) {
    return {
        data: {
            type: 'namespace',
            namespace: node.childForFieldName('name').text,
            objects: [],
        },
        next: node.childForFieldName('body')
    };
}

function _parseObject(node) {
    const type = node.type === 'struct_specifier' ? 'struct' : 'class';
    const name = node.firstNamedChild.text;
    const parent = _findObjectInheritance(node);
    const body = node.childForFieldName('body');

    if (!body) {
        return null;
    }
    const object = {
        type: type,
        name: name,
        inherit: parent?.child(1)?.text ?? null,
        constants: [],
        nested: [],
        ctors: [],
        dtor: {},
        methods: [],
        properties: []
    };

    return {
        data: object,
        next: body
    };
}

function _parseConstant(node, parent) {
    const defaultDecl = node.childForFieldName('default_value');
    const decl = node.childForFieldName('declarator');
    const name = decl.text;
    let value = defaultDecl.text;

    if (defaultDecl.type === 'number_literal') {
        value = +value;
    }
    /*
    else {
        throw new Error(`No implementation to parse default value of type ${defaultDecl.type}.`);
    }
    */
    parent.constants.push({name: name, value: value});
}

function _parseCtor(node, object) {
    if (!object.ctors) {
        return;
    }
    const decl = node.childForFieldName('declarator');
    //const args = decl.childForFieldName('parameters');

    // NOTE: empty object for default constructor.
    const ctor = {};

    /* TODO: add arguments list
    for (let i = 0; i < args.childCount; i++) {
    }
    */
    object.ctors.push(ctor);
}

function _parseDtor(node, object) {
    let comment = node.nextSibling?.text;
    let offset = null;

    if (comment) {
        comment = comment.trim().replace('//', '');
        offset = Number.parseInt(comment, 16);
    }
    const isVirtual = node.text.startsWith('virtual');
    const isOverride = node.text.endsWith('override;');
    const isDefault = node.text.endsWith('default;');
    const dtor = object.dtor;

    if (isVirtual) {
        dtor.virtual = true;
    }
    if (isOverride) {
        dtor.override = true;
    }
    if (isDefault) {
        dtor.default = true;
    }
    if (offset !== null) {
        dtor.offset = offset;
    }
}

function _parseMethod(node, object) {
    if (!object.methods) {
        return;
    }
    let commentNode = _findComment(node);
    let comment = commentNode?.text;
    let offset = null;

    if (comment) {
        comment = comment.trim().replace('//', '');
        offset = Number.parseInt(comment, 16);
    }
    const it = _parseType(node);

    if (!it) {
        return;
    }
    const returnType = it.data;
    const decl = it.next;
    const isVirtual = node.text.startsWith('virtual');
    const isOverride = node.text.includes('override');
    const isPure = node.text.endsWith(' = 0;');

    if (!decl) {
        return;
    }
    const name = decl.childForFieldName('declarator')?.text;

    if (!name) {
        throw new Error(`Failed to parse name of method in:\n${node.text}`);
    }
    const parameters = decl.childForFieldName('parameters');
    const args = _toList(parameters).map(param => _parseArgument(param));

    const method = {};

    if (isVirtual) {
        method.virtual = true;
    }
    if (!_isVoid(returnType)) {
        method.returnType = returnType;
    }
    if (object.name === name) {
        method.ctor = true;
    } else if (`~${object.name}` === name) {
        method.dtor = true;
    } else {
        method.name = name;
    }
    if (args.length > 0) {
        method.args = args;
    }
    if (isPure) {
        method.pure = true;
    }
    if (isOverride) {
        method.override = true;
    }
    if (Number.isInteger(offset)) {
        method.offset = offset;
    }
    object.methods.push(method);
}

function _parseArgument(node) {
    const it = _parseType(node);

    return {
        type: it.data,
        name: it.next.text,
    };
}

function _parseType(node, constants) {
    constants ??= [];
    const typeNode = node.childForFieldName('type');

    if (!typeNode) {
        // NOTE: expect 'number_literal' only.
        return {
            data: {
                value: +node.text
            }
        };
    }
    if (typeNode.type === 'template_type') {
        return _parseTemplateType(node, constants);
    }
    const name = typeNode.text;
    let decl = node.childForFieldName('declarator');
    let fixedArraySize = 0;
    let isConst = false;
    let isPtr = false;
    let isRef = false;

    if (node.firstNamedChild.text === 'const') {
        isConst = true;
    }
    if (decl?.type === 'array_declarator') {
        const sizeNode = decl.childForFieldName('size');
        let text = sizeNode.text;

        for (const constant of constants) {
            if (text.includes(constant.name)) {
                text = text.replace(constant.name, constant.value);
            }
        }
        fixedArraySize = eval(text);
        decl = decl.firstNamedChild;
    }
    if (decl?.type === 'pointer_declarator') {
        isPtr = true;
        decl = decl.child(1);
    }
    if (decl?.type === 'reference_declarator') {
        isRef = true;
        decl = decl.child(1);
    }
    const type = {};

    // TODO: const/volatile/etc.
    if (isConst) {
        type.const = true;
    }
    type.name = name;
    if (fixedArraySize) {
        type.fixedArray = fixedArraySize;
    }
    if (isPtr) {
        type.ptr = true;
    }
    if (isRef) {
        type.ref = true;
    }
    return {
        data: type,
        next: decl
    };
}

function _parseTemplateType(node, constants) {
    const type = node.childForFieldName('type');
    const args = type.childForFieldName('arguments');
    const templates = [];

    for (let i = 0; i < args.namedChildCount; i++) {
        const child = args.namedChild(i);
        const template = _parseType(child, constants);

        templates.push(template.data);
    }
    const name = type.childForFieldName('name');
    const templateType = {
        name: name.text,
        templates: templates,
    };
    const decl = node.childForFieldName('declarator');

    return {
        data: templateType,
        next: decl
    };
}

function _parseProperty(node, object) {
    let comment = node.nextSibling?.text;
    let offset = null;

    if (comment) {
        comment = comment.trim().replace('//', '');
        offset = Number.parseInt(comment, 16);
    }
    const it = _parseType(node, object.constants);
    const type = it.data;
    const decl = it.next;

    const property = {};

    if (!_isVoid(type)) {
        property.type = type;
    }
    property.name = decl.text;
    if (Number.isInteger(offset)) {
        property.offset = offset;
    }
    object.properties.push(property);
}

function _cleanObject(object) {
    if (object.inherit === null) {
        delete object.inherit;
    }
    if (object.nested.length === 0) {
        delete object.nested;
    }
    if (object.ctors.length === 0) {
        delete object.ctors;
    }
    if (Object.keys(object.dtor).length === 0) {
        delete object.dtor;
    }
    if (object.methods.length === 0) {
        delete object.methods;
    } else {
        object.methods = object.methods.filter(method => method.offset !== undefined);
    }
    if (object.properties.length === 0) {
        delete object.properties;
    } else {
        object.properties = object.properties.filter(property => property.offset !== undefined);
    }
}

function _isStructNested(node) {
    return node.firstNamedChild?.type === 'struct_specifier';
}

function _isCtor(node, object) {
    let decl = node.childForFieldName('declarator');

    decl = decl.childForFieldName('declarator');
    return decl?.text === object.name;
}

function _isDtor(node) {
    let decl = node.childForFieldName('declarator');

    decl = decl.childForFieldName('declarator');
    return decl?.type === 'destructor_name';
}

function _isMethod(node) {
    if (node.type === 'function_declarator' || node.type === 'function_definition') {
        return true;
    }
    const decl = node.childForFieldName('declarator');

    if (decl?.type === 'function_declarator') {
        return true;
    }
    if (decl?.type === 'pointer_declarator') {
        return _isMethod(decl);
    }
    return false;
}

function _isVoid(type) {
    return type.name === 'void' && !type.ptr && !type.ref;
}

function _findObjectInheritance(node) {
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);

        if (child.type === 'base_class_clause') {
            return child;
        }
    }
    return null;
}

function _findComment(node) {
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);

        if (child.type === 'comment') {
            return child;
        }
    }
    return node.nextSibling;
}

function _toList(node) {
    const nodes = [];

    for (let i = 0; i < node.namedChildCount; i++) {
        nodes.push(node.namedChild(i));
    }
    return nodes;
}

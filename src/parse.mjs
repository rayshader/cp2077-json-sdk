import fs from "fs";
import Parser from "tree-sitter";
import GrammarCPP from "tree-sitter-cpp";

import {debug, error, nicePath} from "./logger.mjs";

const parser = new Parser();
parser.setLanguage(GrammarCPP);

export function parse(files) {
    const types = [];

    for (const file of files) {
        const type = _parseFile(file);

        if (type) {
            types.push(type);
        }
    }
    return types;
}

function _parseFile(path) {
    try {
        const code = fs.readFileSync(path, {encoding: 'utf8'});
        const tree = parser.parse(code);

        const objects = _parseNodes(tree.rootNode);

        debug(JSON.stringify(objects, null, 2));
        //debug(JSON.stringify(objects));
        return {
            path: path,
            objects: objects
        };
    } catch (e) {
        error(`Failed to parse file ${nicePath(path)}:`);
        error(e);
        return null;
    }
}

function _parseNodes(node, parent) {
    const children = node.children;
    const objects = [];

    for (const child of children) {
        const object = _parseNode(child, parent);

        if (object) {
            objects.push(object);
        }
    }
    return objects;
}

function _parseNode(node, parent) {
    switch (node.type) {
        case 'namespace_definition': {
            const it = _parseNamespace(node);
            const object = {namespace: it.data.namespace};

            _parseNodes(it.next, object);
            return object;
        }
        // TODO: add support for multiple class/struct in same file
        //       either using { and } or some other token.
        case 'struct_specifier':
        case 'class_specifier': {
            const it = _parseObject(node);

            if (it) {
                for (const key of Object.keys(it.data)) {
                    parent[key] = it.data[key];
                }
                _parseNodes(it.next, parent);
            }
            break;
        }
        case 'declaration': {
            // TODO: ctor / dtor
            // (declaration declarator: (function_declarator declarator: (identifier) parameters: (parameter_list)))
            // (declaration declarator: (function_declarator declarator: (destructor_name (identifier)) parameters: (parameter_list) (virtual_specifier)))
            break;
        }
        case 'field_declaration': {
            const decl = node.childForFieldName('declarator');

            if (_isMethod(decl)) {
                const method = _parseMethod(node, parent);

                parent.methods.push(method);
                break;
            } else if (_isProperty(decl)) {
                const property = _parseProperty(node);

                parent.properties.push(property);
            }
            /*else {
                debug('what:');
                debug(decl);
            }
            */
            break;
        }
        case 'function_declarator': {
            const method = _parseMethod(node, parent);

            parent.methods.push(method);
            break;
        }
        default: {
            /*
            else {
                debug('unknown:');
                debug(node);
            }
            */
            break;
        }
    }
}

function _parseNamespace(node) {
    return {
        data: {
            namespace: node.childForFieldName('name').text,
        },
        next: node.childForFieldName('body')
    };
}

function _parseObject(node) {
    const type = node.type === 'struct_specifier' ? 'struct' : 'class';
    const name = node.firstNamedChild.text;
    const body = _findObjectBody(node);

    if (!body) {
        return null;
    }
    const object = {
        type: type,
        name: name,
        methods: [],
        properties: []
    };

    return {
        data: object,
        next: body
    };
}

function _parseMethod(node, object) {
    let comment = node.nextSibling?.text;
    let offset = null;

    if (comment) {
        comment = comment.trim().replace('//', '');
        offset = Number.parseInt(comment, 16);
    }

    let decl = node.childForFieldName('declarator');
    let isPtr = false;

    if (decl.type === 'pointer_declarator') {
        isPtr = true;
        decl = decl.childForFieldName('declarator');
    }

    const isVirtual = node.text.startsWith('virtual');
    const isOverride = node.text.includes('override');
    const isPure = node.text.endsWith(' = 0;');
    const name = decl.childForFieldName('declarator')?.text ?? '<unknown>';

    const parameters = decl.childForFieldName('parameters');
    const args = _toList(parameters).map(param => _parseArgument(param));

    const returnTypeNode = node.childForFieldName('type');
    const returnType = `${returnTypeNode?.text ?? 'void'}${isPtr ? '*' : ''}`;

    const method = {};

    if (isVirtual) {
        method.virtual = true;
    }
    if (returnType !== 'void') {
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
    return method;
}

function _parseArgument(node) {
    return {
        type: node.childForFieldName('type')?.text ?? 'void',
        name: node.childForFieldName('declarator').text
    };
}

function _parseProperty(node) {
    let comment = node.nextSibling?.text;
    let offset = null;

    if (comment) {
        comment = comment.trim().replace('//', '');
        offset = Number.parseInt(comment, 16);
    }
    let decl = node.childForFieldName('declarator');
    let isPtr = false;

    if (decl.type === 'pointer_declarator') {
        isPtr = true;
        decl = decl.childForFieldName('declarator');
    }
    const type = `${node.childForFieldName('type').text}${isPtr ? '*' : ''}`;
    const property = {};

    if (type !== 'void') {
        property.type = type;
    }
    property.name = decl.text;
    if (Number.isInteger(offset)) {
        property.offset = offset;
    }
    return property;
}

function _isMethod(node) {
    if (node.type === 'function_declarator') {
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

function _isProperty(node) {
    if (node.type === 'pointer_declarator') {
        return true;
    }
    // TODO
    return false;
}

function _findObjectBody(node) {
    for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);

        if (child.type === 'field_declaration_list') {
            return child;
        }
    }
    return null;
}

function _toList(node) {
    const nodes = [];

    for (let i = 0; i < node.namedChildCount; i++) {
        nodes.push(node.namedChild(i));
    }
    return nodes;
}

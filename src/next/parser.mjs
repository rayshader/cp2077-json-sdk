import Parser from "tree-sitter";
import GrammarCPP from "tree-sitter-cpp";
import fs from "fs";
import {debug, error, nicePath} from "../logger.mjs";

const treeParser = new Parser();
treeParser.setLanguage(GrammarCPP);

export function parse(files, verbose) {
    const types = [];
    let errors = 0;

    for (const file of files) {
        try {
            const code = fs.readFileSync(file, {encoding: 'utf8'});
            const ast = parseHeader(code);
            if (ast) {
                types.push({path: file, ast: ast});
            }
        } catch (e) {
            errors++;
            if (!verbose) {
                error(`Failed to parse file ${nicePath(file)}.`);
            } else {
                error(`Failed to parse file ${nicePath(file)}:`);
                error(e);
            }
        }
    }
    return {types, errors: errors};
}

/**
 * @typedef AstNodeIterator
 * @type {object}
 * @property {object|array} node - JSON format of a TSNode.
 */

/**
 * @typedef TSNodeIterator
 * @type {object}
 * @property {object=} node
 * @property {object=} extra - optional data to associate with the node.
 * @property {boolean=} pop - whether to pop the node from the AST stack?
 */

export function parseHeader(code) {
    const tree = treeParser.parse(code);

    debug('');

    /** @type {AstNodeIterator[]} */
    const ast = [];
    /** @type {TSNodeIterator[]} */
    const stack = [];

    stack.push({node: tree.rootNode});
    while (stack.length > 0) {
        parseNode(ast, stack);
    }

    const root = ast?.[0]?.node;
    if (!root) {
        return null;
    }

    //*
    debug('AST JSON:');
    debug(JSON.stringify(root, null, 1));
    //*/

    return root;
}

/**
 * @param type {string}
 * @returns {boolean}
 */
function canParse(type) {
    return type === 'namespace_definition' || type === 'struct_specifier';
}

/**
 * @param ast {AstNodeIterator[]}
 * @returns {AstNodeIterator}
 */
function getAstCurrent(ast) {
    return ast.length === 0 ? null : ast[ast.length - 1];
}

/**
 * @param node {object}
 * @param type {string}
 * @returns {object}
 */
function findChildByType(node, type) {
    return node.children.find((child) => child.type === type);
}

/**
 * @param node {object}
 * @param type {string}
 * @returns {object[]}
 */
function findChildrenByType(node, type) {
    return node.children.filter((child) => child.type === type);
}

/**
 * @param node {object}
 * @return {object[]}
 */
function findDeclarators(node) {
    return node.children.filter((child) => child.type.endsWith('_declarator'));
}

/**
 * @typedef ParserInfo
 * @type {object}
 * @property {string} type - of the node from tree-sitter-cpp grammar
 * @property {function} callback - callback function to call when parsing this node type
 */

/** @type {ParserInfo[]} */
const parsers = [
    {type: 'translation_unit', callback: parseTranslationUnit},
    {type: 'namespace_definition', callback: parseNamespace},
    {type: 'declaration_list', callback: parseDeclarationList},
    {type: 'struct_specifier', callback: parseStruct},
    {type: 'field_declaration_list', callback: parseFieldDeclarationList},
    {type: 'field_declaration', callback: parseFieldDeclaration},
    {type: 'type_identifier', callback: parseType},
    {type: 'primitive_type', callback: parsePrimitiveType},
    {type: 'template_type', callback: parseTemplateType},
];

/**
 * @param ast {AstNodeIterator[]}
 * @param stack {TSNodeIterator[]}
 */
function parseNode(ast, stack) {
    const it = stack.pop();
    if (it.pop) {
        // Always keep the first node in the stack.
        if (ast.length > 1) {
            ast.pop();
        }
        return;
    }

    const node = it.node;

    const parser = parsers.find((item) => item.type === node.type);
    if (!parser) {
        error(`Missing implementation for node type: ${node.type}`);
        return;
    }

    parser.callback(ast, stack, node, it.extra);
}

/**
 * @param ast {AstNodeIterator[]}
 * @param stack {TSNodeIterator[]}
 * @param node {object}
 */
function parseTranslationUnit(ast, stack, node) {
    for (const child of node.children) {
        if (!canParse(child.type)) {
            continue;
        }

        stack.push({node: child});
    }
}

/**
 * @param ast {AstNodeIterator[]}
 * @param stack {TSNodeIterator[]}
 * @param node {object}
 */
function parseNamespace(ast, stack, node) {
    const name = findChildByType(node, 'namespace_identifier');
    if (!name) {
        return;
    }

    const body = findChildByType(node, 'declaration_list');
    if (!body) {
        return;
    }

    const namespace = {
        'type': 'namespace',
        'name': name.text,
        'children': []
    };

    const it = getAstCurrent(ast);
    it?.node.push({node: namespace});
    it?.node.push({node: namespace.children});

    ast.push({node: namespace});
    ast.push({node: namespace.children});
    stack.push({pop: true});
    stack.push({node: body});
}

/**
 * @param ast {AstNodeIterator[]}
 * @param stack {TSNodeIterator[]}
 * @param node {object}
 */
function parseDeclarationList(ast, stack, node) {
    const structs = findChildrenByType(node, 'struct_specifier');
    for (const struct of structs) {
        stack.push({node: struct});
    }
}

/**
 * @param ast {AstNodeIterator[]}
 * @param stack {TSNodeIterator[]}
 * @param node {object}
 */
function parseStruct(ast, stack, node) {
    const fields = findChildByType(node, 'field_declaration_list');
    if (!fields) {
        // Ignore forward struct declaration.
        return;
    }

    const name = findChildByType(node, 'type_identifier');
    if (!name) {
        return;
    }

    const struct = {
        'type': 'struct',
        'name': name.text,
        'fields': []
    };

    const it = getAstCurrent(ast);
    it?.node.push(struct);

    ast.push({node: struct});
    stack.push({pop: true});
    stack.push({node: fields});
}

/**
 * @param ast {AstNodeIterator[]}
 * @param stack {TSNodeIterator[]}
 * @param node {object}
 */
function parseFieldDeclarationList(ast, stack, node) {
    const it = getAstCurrent(ast);
    ast.push({node: it.node.fields});
    stack.push({pop: true});

    const size = node.children.length;
    for (let i = 0; i < size; i++) {
        const child = node.children[i];
        const next = i + 1 < size ? node.children[i + 1] : null;

        if (child.type === 'field_declaration') {
            /** @type {TSNodeIterator} */
            const field = {node: child};

            // Associate comment with this field to extract offset information
            if (next?.type === 'comment') {
                field.extra = next;
            }

            stack.push(field);
        }
    }

    // Ignore functions
}

/**
 * @param ast {AstNodeIterator[]}
 * @param stack {TSNodeIterator[]}
 * @param node {object}
 * @param extra {object}
 */
function parseFieldDeclaration(ast, stack, node, extra) {
    const type = node.childForFieldName('type');
    if (!type) {
        return;
    }

    const decl = node.childForFieldName('declarator');
    if (!decl) {
        return;
    }

    const declarators = findDeclarators(node);
    const name = findChildByType(decl, 'field_identifier');

    const storage = findChildByType(node, 'storage_class_specifier');
    const qualifiers = findChildrenByType(node, 'type_qualifier');
    const field = {
        'type': {},
        'name': name ? name.text : decl.text,
    };

    const it = getAstCurrent(ast);
    it.node.push(field);

    ast.push({node: field.type});
    stack.push({pop: true});
    stack.push({node: type, extra: declarators});

    debug(node.children);
    debug(`<field type="${type.text}" decl="${decl.text}" />`);
}

function parseType(ast, stack, node, extra) {
    const it = getAstCurrent(ast);
    it.node.name = node.text;

    parseExtraType(it.node, extra);
}

/**
 * Parse primitive types with declarators like:
 * - `bool`
 * - `float`
 * - `void*`
 * - `int32_t&`
 */
function parsePrimitiveType(ast, stack, node, extra) {
    const it = getAstCurrent(ast);
    it.node.name = node.text;

    parseExtraType(it.node, extra);
}

/**
 * Parse template types like:
 * - `DynArray<T>`
 * - `DynArray<int>`
 * - `DynArray<Handle<T>>`
 * - `DynArray<Handle<IScriptable>>`
 * - `HashMap<T, K>`
 * - `HashMap<uint64_t, CString>`
 * - `HashMap<uint64_t, WeakHandle<GameObject>>`
 */
function parseTemplateType(ast, stack, node) {
    const it = getAstCurrent(ast);
    const name = node.childForFieldName('name');
    const args = node.childForFieldName('arguments');

    const templates = [];
    const descriptors = findChildrenByType(args, 'type_descriptor');
    for (const descriptor of descriptors) {
        const type = descriptor.childForFieldName('type');
        const decl = descriptor.childForFieldName('declarator');
        const template = {};
        templates.push(template);

        ast.push({node: template});
        stack.push({pop: true});
        stack.push({node: type, extra: decl ? [decl] : null});
    }

    it.node.name = name.text;
    it.node.templates = templates;
}

/**
 * Parse pointer and reference declarators.
 */
function parseExtraType(node, extra) {
    if (!extra) {
        return;
    }

    for (const decl of extra) {
        switch (decl.type) {
            case 'abstract_pointer_declarator':
            case 'pointer_declarator':
                node.ptr = true;
                break;
            case 'reference_declarator':
                node.ref = true;
                break;
        }
    }
}

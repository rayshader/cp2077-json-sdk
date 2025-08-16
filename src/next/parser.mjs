import Parser from "tree-sitter";
import GrammarCPP from "tree-sitter-cpp";
import fs from "fs";
import {debug, error, nicePath} from "../logger.mjs";
import {formatCPP} from "./formatter.mjs";

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
 * @typedef {StackIterator[]} Stack
 */

/**
 * @typedef StackIterator
 * @param code
 * @property {object=} parent
 * @property {object=} node
 * @property {object=} extra
 */

export function parseHeader(code) {
    const tree = treeParser.parse(code);

    debug('');

    /** @type {any[]} */
    const root = [];

    /** @type {Stack} */
    const stack = [];

    // Parse this header and create its AST document.
    stack.push({parent: root, node: tree.rootNode});
    while (stack.length > 0) {
        parseNode(stack);
    }

    /*
    debug('AST JSON:');
    debug(JSON.stringify(root, null, 1));
    //*/

    //*
    debug('```cpp');
    for (const node of root) {
        const code = formatCPP(node, 0);
        code.split('\n').forEach((line) => debug(line, true));
    }
    debug('```');
    //*/

    return root;
}

/**
 * @param type {string}
 * @returns {boolean}
 */
function canParse(type) {
    return type === 'namespace_definition' || type === 'struct_specifier' || type === 'template_declaration';
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

function isFunction(decl) {
    do {
        const current = decl;
        if (current.type === 'function_declarator') {
            return true;
        }
        decl = current.childForFieldName('declarator');
        decl ??= findChildByType(current, 'function_declarator');
    } while (decl);
    return false;
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
    {type: 'declaration_list', callback: parseTranslationUnit}, // See parseDeclarationList()
    {type: 'template_declaration', callback: parseTemplateDeclaration},
    {type: 'struct_specifier', callback: parseStruct},
    {type: 'base_class_clause', callback: parseBaseClassClause},
    {type: 'field_declaration_list', callback: parseFieldDeclarationList},
    {type: 'field_declaration', callback: parseFieldDeclaration},
    {type: 'type_identifier', callback: parseType},
    {type: 'primitive_type', callback: parsePrimitiveType},
    {type: 'template_type', callback: parseTemplateType},
];

/**
 * @param stack {Stack}
 */
function parseNode(stack) {
    const it = stack.pop();
    const node = it.node;
    const parser = parsers.find((item) => item.type === node.type);
    if (!parser) {
        error(`Missing implementation for node type: ${node.type}`);
        return;
    }

    parser.callback(stack, it);
}

/**
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseTranslationUnit(stack, {parent, node}) {
    for (const child of node.children) {
        if (!canParse(child.type)) {
            continue;
        }

        stack.push({parent: parent, node: child});
    }
}

/**
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseNamespace(stack, {parent, node}) {
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

    parent.splice(0, 0, namespace);
    stack.push({parent: namespace.children, node: body});
}

/**
 * NOTE: exactly the same as {@link parseTranslationUnit} for now. Function is
 *       kept in case this token diverges in the future.
 *
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseDeclarationList(stack, {parent, node}) {
    for (const child of node.children) {
        if (!canParse(child.type)) {
            continue;
        }
        stack.push({parent: parent, node: child});
    }
}

/**
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseStruct(stack, {parent, node, extra}) {
    const inherit = findChildByType(node, 'base_class_clause');

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
    };
    if (extra) {
        struct.templates = extra;
    }
    if (inherit) {
        struct.inherit = {};
        stack.push({parent: struct.inherit, node: inherit});
    }
    struct.fields = [];

    parent.splice(0, 0, struct);
    stack.push({parent: struct.fields, node: fields});
}

/**
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseBaseClassClause(stack, {parent, node}) {
    // NOTE: only one base class is supported.
    const clause = node.child(1);
    stack.push({parent: parent, node: clause});
}

/**
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseTemplateDeclaration(stack, {parent, node}) {
    const list = findChildByType(node, 'template_parameter_list');
    const next = list.nextSibling;
    const templates = [];

    for (const param of list.children) {
        const type = findChildByType(param, 'type_identifier');
        if (!type) {
            continue;
        }

        const template = {};
        templates.push(template);

        stack.push({parent: template, node: type});
    }

    stack.push({parent: parent, node: next, extra: templates});
}

/**
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseFieldDeclarationList(stack, {parent, node}) {
    const size = node.children.length;
    for (let i = 0; i < size; i++) {
        const child = node.children[i];
        const next = i + 1 < size ? node.children[i + 1] : null;

        if (child.type === 'field_declaration') {
            /** @type {StackIterator} */
            const field = {parent: parent, node: child};

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
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseFieldDeclaration(stack, {parent, node, extra}) {
    const type = node.childForFieldName('type');
    if (!type) {
        return;
    }

    const decl = node.childForFieldName('declarator');
    if (!decl) {
        return;
    }
    if (isFunction(decl)) {
        return;
    }

    const declarators = findDeclarators(node);
    const name = findChildByType(decl, 'field_identifier');
    const qualifiers = findChildrenByType(node, 'type_qualifier');

    const field = {};
    // NOTE: extract offset information from comment when present
    if (extra && extra.type === 'comment') {
        const match = extra.text.match(/\/\/\s*(?<offset>[0-9a-fA-F]+)/);
        if (match && match.groups.offset) {
            field.offset = parseInt(match.groups.offset, 16);
        }
    }

    field.type = {};

    const storage = findChildByType(node, 'storage_class_specifier');
    if (storage) {
        field.type.static = true;
    }

    parseQualifiers(field.type, qualifiers);

    field.name = name ? name.text : decl.text;

    parent.splice(0, 0, field);
    stack.push({parent: field.type, node: type, extra: declarators});
}

/**
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseType(stack, {parent, node, extra}) {
    parent.name = node.text;

    parseDeclarators(parent, extra);
}

/**
 * Parse primitive types with declarators like:
 * - `bool`
 * - `float`
 * - `void*`
 * - `int32_t&`
 *
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parsePrimitiveType(stack, {parent, node, extra}) {
    parent.name = node.text;

    parseDeclarators(parent, extra);
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
 *
 * @param stack {Stack}
 * @param it {StackIterator}
 */
function parseTemplateType(stack, {parent, node, extra}) {
    const args = node.childForFieldName('arguments');
    const descriptors = findChildrenByType(args, 'type_descriptor');
    const templates = [];

    for (const descriptor of descriptors) {
        const type = descriptor.childForFieldName('type');
        const decl = descriptor.childForFieldName('declarator');
        const template = {};
        templates.push(template);

        stack.push({parent: template, node: type, extra: decl ? [decl] : null});
    }

    const name = node.childForFieldName('name');
    parent.name = name.text;
    parent.templates = templates;

    parseDeclarators(parent, extra);
}

/**
 * Parse pointer and reference declarators.
 */
function parseDeclarators(node, declarators) {
    if (!declarators) {
        return;
    }

    for (const declarator of declarators) {
        switch (declarator.type) {
            case 'abstract_pointer_declarator':
            case 'pointer_declarator':
                node.ptr = true;
                break;
            case 'reference_declarator':
                node.ref = true;
                break;
            case 'array_declarator':
                const size = declarator.childForFieldName('size');
                node.fixedArray = evalExpression(size);
                break;
        }
    }
}

/**
 * Parse constexpr, const and volatile qualifiers.
 */
function parseQualifiers(node, qualifiers) {
    if (!qualifiers) {
        return;
    }

    for (const qualifier of qualifiers) {
        switch (qualifier.text) {
            case 'constexpr':
                // TODO: extract default value.
                node.constexpr = true;
                break;
            case 'const':
                node.const = true;
                break;
            case 'volatile':
                node.volatile = true;
                break;
        }
    }
}

function evalExpression(expr) {
    switch (expr.type) {
        case 'number_literal':
            return parseNumber(expr.text);
        case 'binary_expression':
            const left = expr.child(0);
            const operator = expr.child(1);
            const right = expr.child(2);

            const a = evalExpression(left);
            const b = evalExpression(right);
            const op = operator.text;

            switch (op) {
                case '-':
                    return a - b;
                case '+':
                    return a + b;
                case '*':
                    return a * b;
                case '/':
                    return a / b;
                case '%':
                    return a % b;
                case '<<':
                    return a << b;
                case '>>':
                    return a >> b;
                default:
                    return 0;
            }
        case 'parenthesized_expression':
            expr = expr.child(1);
            return evalExpression(expr);
        default:
            error(`Missing expression parser for: ${expr.type}`);
            return 0;
    }
}

function parseNumber(literal) {
    const options = {
        offset: 0,
        radix: 10
    };

    if (literal.startsWith('0x')) {
        options.offset = 2;
        options.radix = 16;
    }
    if (literal.startsWith('0b')) {
        options.offset = 2;
        options.radix = 2;
    }
    return parseInt(literal.substring(options.offset), options.radix);
}

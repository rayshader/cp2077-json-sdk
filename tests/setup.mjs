import fs from "fs";
import {formatCPP} from "../src/next/formatter.mjs";
import {parseHeader} from "../src/next/parser.mjs";

/**
 * @param path {string}
 * @return {string}
 */
export function read(path) {
    return fs.readFileSync(path, 'utf8');
}

/**
 * Format the AST document and parse it again to validate the formatter in the same pass.
 * @param ast {object[]}
 * @returns {object[]}
 */
export function withFormatter(ast) {
    let code = '';
    for (const node of ast) {
        code += formatCPP(node, 0);
    }
    return parseHeader(code);
}

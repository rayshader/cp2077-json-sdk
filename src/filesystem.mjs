import fs from "fs";
import {join} from "path";
import {debug, error, info, nicePath} from "./logger.mjs";
import {parseCPP} from "./parser.mjs";

export function traverse(path) {
    const dirs = fs.readdirSync(path);
    const files = [];

    for (const dir of dirs) {
        const childPath = join(path, dir);

        if (fs.statSync(childPath).isDirectory()) {
            const children = traverse(childPath);

            files.push(...children);
        } else if (!childPath.endsWith('-inl.hpp')) {
            files.push(childPath);
        }
    }
    return files;
}

export function parse(files, verbose) {
    const documents = [];
    let errors = 0;

    if (verbose) {
        console.log('');
    }

    for (const file of files) {
        try {
            const code = fs.readFileSync(file, {encoding: 'utf8'});

            if (verbose) {
                info(`${nicePath(file)}`);
            }
            const ast = parseCPP(code, verbose);
            if (ast) {
                documents.push({path: file, ast: ast});
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
    return {documents: documents, errors: errors};
}

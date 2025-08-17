import fs from "fs";
import {dirname, join, relative} from "path";
import chalk from "chalk";
import {z} from "zod";
import {parser as cliParser} from "zod-opts";

import {debug, print, error, info, nicePath, formatTime, warn} from "./logger.mjs";
import {traverse, parse} from "./filesystem.mjs";

const opts = cliParser()
    .name('pnpm start')
    .version('1.0.0')
    .options({
        sdk: {
            type: z.string().describe('Path to RED4ext.SDK.').default('sdk'),
            alias: 'src'
        },
        output: {
            type: z.string().describe('Path to output JSON types.').default('types'),
            alias: 'dst'
        },
        /*
        merge: {
            type: z.boolean().describe('Merge all types in a single file.').default(false),
        },
        */
        minify: {
            type: z.boolean().describe('Minify JSON output.').default(false),
            alias: 'm'
        },
        compress: {
            type: z.boolean().describe('Compress JSON output.').default(false),
            alias: 'c'
        },
        verbose: {
            type: z.boolean().describe('Show stacktrace of errors.').default(false),
            alias: 'v'
        }
    }).parse();

const sdkPath = opts.sdk;
const outputPath = opts.output;
//const merge = opts.merge;
const minify = opts.minify;
const compress = opts.compress;
const verbose = opts.verbose;

if (!fs.existsSync(sdkPath) || !fs.statSync(sdkPath).isDirectory()) {
    error(`Failed to find SDK in ${nicePath(sdkPath)}.`);
    process.exit(0);
}

const srcPath = join(sdkPath, 'include', 'RED4ext');
if (!fs.existsSync(srcPath)) {
    error(`Failed to find ${nicePath('include/RED4ext')} directory in SDK.`);
    process.exit(0);
}

if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
} else if (!fs.statSync(outputPath).isDirectory()) {
    error(`Output path is not a directory ${nicePath(outputPath)}.`);
    process.exit(0);
}

const printOK = () => {
    print(chalk.bold.green(' OK'));
};

const startAt = Date.now();
info(`Listing all header files in ${nicePath(srcPath)}...`, false);

// Development environment
/*
const files = [
    //join('tests', 'class.hpp'),
    //join('tests', 'enum.hpp'),
    //join('tests', 'struct.hpp'),
    //join('tests', 'struct_alignment.hpp'),
    //join('tests', 'struct_bitfield.hpp'),
    //join('tests', 'struct_empty.hpp'),
    //join('tests', 'struct_forward.hpp'),
    //join('tests', 'struct_functions.hpp'),
    //join('tests', 'struct_inherit.hpp'),
    //join('tests', 'struct_namespace.hpp'),
    //join('tests', 'struct_namespace_nested.hpp'),
    //join('tests', 'struct_nested.hpp'),
    //join('tests', 'struct_template.hpp'),

    // TODO: support union declarations (currently ignored)
    //join(srcPath, 'CString.hpp'),
    // TODO: fix enum value assignment with expression and constant value
    //join(srcPath, 'SystemUpdate.hpp'),
];
//*/

// Production environment
//*
const ignores = [
    join('include', 'RED4ext', 'Api'),
    join('include', 'RED4ext', 'Detail'),
];
const files = traverse(srcPath).filter(path => !ignores.includes(path));
//*/

printOK();

info(`Parsing ${chalk.bold(files.length)} header file${files.length > 1 ? 's' : ''}...`, false);
const {documents, errors} = parse(files, verbose);
if (errors > 0) {
    warn(`Failed to parse ${chalk.bold(errors)} header file${errors > 1 ? 's' : ''}.`);
    if (!verbose) {
        warn(`Run with option ${chalk.bold('--verbose')} for more details.`);
    }
} else if (!verbose) {
    printOK();
}

const count = documents.flatMap((document) => document.ast).length;

if (compress) {
    info('Compressing JSON format...', false);

    const labels = [
        'type', 'name', 'offset', 'children', 'nested', 'fields', 'templates', 'namespaces',
        'base', 'values', 'default', 'constant', 'fixedArray', 'ptr', 'ref', 'static', 'constexpr', 'const',
        'bitfield', 'value', 'visibility'
    ];
    const bindings = labels
        .map((label, i) => [label, String.fromCharCode(i + 'a'.charCodeAt(0))]);

    const compressor = (object) => {
        for (const binding of bindings) {
            const key = binding[0];
            if (key in object) {
                object[binding[1]] = object[key];
                delete object[key];
            }
        }
    };

    documents.forEach((document) => {
        const compressObject = (object) => {
            if (!(object instanceof Object)) {
                return;
            }

            for (const key of Object.keys(object)) {
                const value = object[key];

                if (value instanceof Object) {
                    compressObject(value);
                }
                if (value instanceof Array) {
                    for (const child of value) {
                        compressObject(child);
                    }
                }
            }

            compressor(object);
        };

        const objects = document.ast;
        objects.forEach(compressObject);
    });

    printOK();
}

info(`Writing AST to JSON format for ${chalk.bold(count)} type${count > 1 ? 's' : ''}...`, false);

let ignore = 0;

documents.forEach((document) => {
    const objects = document.ast;
    let data = '';

    objects.forEach((object, i) => {
        if (minify) {
            data += JSON.stringify(object);
        } else {
            data += JSON.stringify(object, null, 2);
        }
        if (i + 1 < objects.length) {
            data += '\n\n';
        }
    });
    const relativePath = relative(join('sdk', 'include', 'RED4ext'), document.path);
    const filePath = join(outputPath, relativePath).replace('.hpp', '.json');
    const dirPath = dirname(filePath);

    if (!data || data.length === 0) {
        if (verbose) {
            if (ignore === 0) {
                print('');
            }
            info(`Ignore empty file ${nicePath(join(outputPath, relativePath))}.`);
            ignore++;
        }
        return;
    }
    try {
        fs.mkdirSync(dirPath, {recursive: true});
    } catch (_) {
    }

    fs.writeFileSync(filePath, data, {encoding: 'utf8'});
})

if (ignore === 0) {
    printOK();
}

const elapsedTime = Date.now() - startAt;

info(`Generated in ${chalk.bold(formatTime(elapsedTime))}.`);

import fs from "fs";
import {dirname, join, relative} from "path";
import chalk from "chalk";
import {z} from "zod";
import {parser as cliParser} from "zod-opts";

import {debug, print, error, info, nicePath, formatTime, warn} from "./logger.mjs";
import {parse} from "./parser.mjs";
import {traverse} from "./traverse.mjs";

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
//*
const files = [
    //join('tests', 'class.hpp'),
    //join('tests', 'enum.hpp'),
    //join('tests', 'struct.hpp'),
    //join('tests', 'struct_alignment.hpp'),
    //join('tests', 'struct_empty.hpp'),
    //join('tests', 'struct_forward.hpp'),
    //join('tests', 'struct_functions.hpp'),
    //join('tests', 'struct_inherit.hpp'),
    //join('tests', 'struct_namespace.hpp'),
    //join('tests', 'struct_namespace_nested.hpp'),
    //join('tests', 'struct_template.hpp'),

    //join(srcPath, 'Memory', 'Pool.hpp'),  // TODO: support templated functions? support constant for fixedArray
    //join(srcPath, 'Scripting', 'Natives', 'worldAnimationSystem.hpp'),    // TODO: support identifier for expression?
    //join(srcPath, 'Scripting', 'Natives', 'Generated', 'EMeshChunkFlags.hpp'),
];
//*/
/*
const files = traverse(srcPath).filter(path => {
    if (path.includes(join('include', 'RED4ext', 'Api'))) {
        return false;
    }
    return true;
});
//*/

printOK();

info(`Parsing ${chalk.bold(files.length)} header file${files.length > 1 ? 's' : ''}...`, false);
const {types, errors} = parse(files, verbose);

if (errors === 0) {
    printOK();
} else {
    warn(`Failed to parse ${chalk.bold(errors)} header file${errors > 1 ? 's' : ''}.`);
    if (!verbose) {
        warn(`Run with option ${chalk.bold('--verbose')} for more details.`);
    }
}

/*

const flattenObjects = (type) => {
    if (!type.objects) {
        return [];
    }
    return [...type.objects, type.objects.flatMap(flattenObjects)];
};
const count = types.flatMap(flattenObjects).length;

info(`Writing AST to JSON format for ${chalk.bold(count)} type${count > 1 ? 's' : ''}...`, false);

let ignore = 0;

types.forEach(type => {
    const objects = type.objects;
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
    const relativePath = relative(join('sdk', 'include', 'RED4ext'), type.path);
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
*/

const elapsedTime = Date.now() - startAt;

info(`Generated in ${chalk.bold(formatTime(elapsedTime))}.`);

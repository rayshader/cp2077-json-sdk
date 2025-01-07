import fs from "fs";
import {dirname, join, relative} from "path";
import chalk from "chalk";
import {z} from "zod";
import {parser as cliParser} from "zod-opts";

import {debug, error, info, nicePath} from "./logger.mjs";
import {parse} from "./parse.mjs";

const opts = cliParser()
    .name('pnpm run start')
    .version('1.0.0')
    .options({
        sdk: {
            type: z.string().describe('Path to RED4ext.SDK.'),
        },
        output: {
            type: z.string().describe('Path to output JSON types.').default('types'),
        },
        minify: {
            type: z.boolean().describe('Minify JSON output.').default(false)
        },
    }).parse();

// NOTE: need to be executed from root directory.
const projectPath = dirname(import.meta.dirname);
const sdkPath = opts.sdk;
const outputPath = opts.output;
const minify = opts.minify;

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

info(`Listing all source files in ${nicePath(srcPath)}...`);
const files = [
    //join(srcPath, 'Scripting', 'IScriptable.hpp'), // OK
    join(srcPath, 'ISerializable.hpp'),
];// traverse(srcPath);

info(`Parsing ${chalk.bold(files.length)} source files...`);
const types = parse(files);

info(`Found ${chalk.bold(types.length)} types.`);

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

    try {
        fs.mkdirSync(dirPath, {recursive: true});
    } catch (_) {
    }

    fs.writeFileSync(filePath, data, {encoding: 'utf8'});
})

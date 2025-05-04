import fs from "fs";
import {dirname, join, relative} from "path";
import chalk from "chalk";
import {z} from "zod";
import {parser as cliParser} from "zod-opts";

import {debug, print, error, info, nicePath, formatTime, warn} from "./logger.mjs";
import {parse} from "./parse.mjs";
import {traverse} from "./traverse.mjs";

const opts = cliParser()
    .name('pnpm run start')
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
info(`Listing all source files in ${nicePath(srcPath)}...`, false);
/*
const files = [
    //join(srcPath, 'Scripting', 'IScriptable.hpp'),
    //join(srcPath, 'Scripting', 'Stack.hpp'),
    //join(srcPath, 'ISerializable.hpp'),
    //join(srcPath, 'CName.hpp'),
    //join(srcPath, 'GameEngine.hpp'),
    //join(srcPath, 'LaunchParameters.hpp'),
    //join(srcPath, 'Scripting', 'Natives', 'Generated', 'move', 'Policies.hpp'),
    //join(srcPath, 'Hashing', 'CRC.hpp'),
    //join(srcPath, 'Memory', 'Pool.hpp'),
    //join(srcPath, 'Scripting', 'Natives', 'Vector4.hpp'),
    //join(srcPath, 'RTTISystem.hpp'),
    //join(srcPath, 'Scripting', 'Natives', 'Generated', 'game', 'weapon', 'Grenade.hpp'),
    //join(srcPath, 'Scripting', 'Natives', 'worldAnimationSystem.hpp'),
    //join(srcPath, 'Memory', 'SharedPtr.hpp'),
    //join(srcPath, 'Map.hpp'),
    //join(srcPath, 'Scripting', 'Natives', 'Generated', 'EMeshChunkFlags.hpp'),
    //join(srcPath, 'Scripting', 'Natives', 'Generated', 'ECookingPlatform.hpp'),
    //join(srcPath, 'Scripting', 'Natives', 'Generated', 'ETextureCompression.hpp'),
    //join(srcPath, 'ResourceDepot.hpp'),
    //join(srcPath, 'Scripting', 'Natives', 'gameIEntityStubSystem.hpp'),
];
//*/
//*
const files = traverse(srcPath).filter(path => {
    if (path.includes(join('include', 'RED4ext', 'Api'))) {
        return false;
    }
    return true;
});
//*/

printOK();

info(`Parsing ${chalk.bold(files.length)} source file${files.length > 1 ? 's' : ''}...`, false);
const {types, errors} = parse(files, verbose);

if (errors === 0) {
    printOK();
} else {
    warn(`Failed to parse ${chalk.bold(errors)} source file${errors > 1 ? 's' : ''}.`);
    if (!verbose) {
        warn(`Run with option ${chalk.bold('--verbose')} for more details.`);
    }
}

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

const elapsedTime = Date.now() - startAt;

info(`Generated in ${chalk.bold(formatTime(elapsedTime))}.`);

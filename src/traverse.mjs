import fs from "fs";
import {join} from "path";

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

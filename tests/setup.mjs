import fs from "fs";

export function read(path) {
    return fs.readFileSync(path, 'utf8');
}

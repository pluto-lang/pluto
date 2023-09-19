import * as path from "path";
import * as fs from 'fs';

export function writeToFile(basedir: string, filename: string, content: string) {
    // Ensure the directory exists
    const dirpath = path.join(basedir, filename.substring(0, filename.lastIndexOf('/')));
    fs.mkdirSync(dirpath, { recursive: true });

    const filepath = path.join(basedir, filename);
    fs.writeFileSync(filepath, content);
}
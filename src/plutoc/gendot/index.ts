import * as fs from "fs";
import { parseArchFromYaml } from "../models";
import { writeToFile } from "../utils";

const archFilepath = process.argv[2];
const outputPath = process.argv[3];

const archSource = fs.readFileSync(archFilepath, 'utf-8');
const arch = parseArchFromYaml(archSource);

const dotText = arch.toGraphviz();
writeToFile('', outputPath, dotText);
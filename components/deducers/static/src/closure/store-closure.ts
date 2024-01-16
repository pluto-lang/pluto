import { ensureDirSync, readFileSync, writeFileSync } from "fs-extra";
import { bundle } from "./compile";

type Position = [number, number];

interface Segment {
  readonly depth: number;
  readonly start: Position;
  readonly end: Position;
}

type FileSelection = Record<string, Segment[]>;

export interface DependentResource {
  imports: string;
  name: string;
  type: string;
  parameters: string;
}

export interface Location {
  file: string;
  depth: number;
  linenum: {
    start: string;
    end: string;
  };
}

export function writeClosureToDir(
  imports: string,
  locations: Location[],
  dependentResources: DependentResource[],
  dirpath: string
) {
  const sourceCode = generateSourceCode(imports, locations, dependentResources);
  ensureDirSync(dirpath);
  const filepath = dirpath + "/index.ts";
  writeFileSync(filepath, sourceCode);
  bundle(filepath, dirpath);
}

function generateSourceCode(
  imports: string,
  locations: Location[],
  dependentResources: DependentResource[]
): string {
  let cirCode = imports + "\n";

  // Find the dependencies of this CIR and build corresponding instances.
  for (const dependentRes of dependentResources) {
    // TODO: verify if the buildClient function exists. If it does not, use the original statement.
    cirCode += dependentRes.imports + "\n";
    cirCode += `const ${dependentRes.name} = ${dependentRes.type}.buildClient(${dependentRes.parameters});\n`;
  }

  const fileSelections: FileSelection = {};
  locations.forEach((loc) => {
    if (!fileSelections.hasOwnProperty(loc.file)) {
      fileSelections[loc.file] = [];
    }

    const startPos = loc.linenum["start"].split("-").map((n) => Number(n));
    const endPos = loc.linenum["end"].split("-").map((n) => Number(n));
    fileSelections[loc.file].push({
      depth: loc.depth,
      start: startPos as [number, number],
      end: endPos as [number, number],
    });
  });
  if (Object.keys(fileSelections).length != 1) {
    throw new Error(`Currently, Pluto can only support single file.`);
  }

  const fileCodes: [string, string][] = []; // file, code
  for (const file in fileSelections) {
    const curFileCode = genFileCode(file, fileSelections[file]);
    fileCodes.push([file, curFileCode]);
  }
  return cirCode + fileCodes[0][1];
}

function genFileCode(file: string, segments: Segment[]): string {
  segments.sort((a, b) => {
    if (a.start[0] != b.start[0]) return a.start[0] - b.start[0];
    return a.start[1] - b.start[1];
  });

  const usercode = readFileSync(file, "utf-8");
  const lines = usercode.split("\n");

  let curFileCode = "";
  for (const segment of segments) {
    const [startLine, startPos] = segment.start;
    const [endLine, endPos] = segment.end;

    let curSegCode = "";
    // Iterate through the range of this segment and construct the code.
    for (let lineIdx = startLine; lineIdx <= endLine; lineIdx++) {
      const linecode = lines[lineIdx];
      let curLineCode = "";
      if (lineIdx == startLine) {
        if (segment.depth == 0) curLineCode = `export default `;
        curLineCode += linecode.slice(startPos);
      } else if (lineIdx == endLine) {
        curLineCode = linecode.slice(0, endPos);
      } else {
        curLineCode = linecode;
      }
      curSegCode += curLineCode + "\n";
    }
    curFileCode += curSegCode + "\n";
  }
  return curFileCode;
}

import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import { randomUUID } from "crypto";
import { Uri } from "pyright-internal/dist/common/uri/uri";
import { LogLevel } from "pyright-internal/dist/common/console";
import { Program } from "pyright-internal/dist/analyzer/program";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { TypeSearcher } from "../type-searcher";
import * as ProgramUtils from "../program-utils";

export interface ParseResult {
  program: Program;
  sourceFiles: SourceFile[];
}

export function parseFiles(filePaths: string[]) {
  const program = ProgramUtils.createProgram({
    logLevel: LogLevel.Warn,
    extraPaths: [
      path.resolve(__dirname, "../../../../../packages/base-py"),
      path.resolve(__dirname, "../../../../../packages/pluto-py"),
    ],
  });

  const uris = filePaths.map((name) => Uri.file(name));
  program.setTrackedFiles(uris);

  // eslint-disable-next-line no-empty
  while (program.analyze()) {}

  const sourceFiles = uris.map((uri) => program.getSourceFile(uri)!);
  return { program, sourceFiles };
}

export function parseCode(code: string, filename: string = "tmp.py") {
  const program = ProgramUtils.createProgram({
    logLevel: LogLevel.Warn,
    extraPaths: [
      path.resolve(__dirname, "../../../../../packages/base-py"),
      path.resolve(__dirname, "../../../../../packages/pluto-py"),
    ],
  });

  const { tmpdir, cleanup } = getTmpDir();
  const tmpfile = path.join(tmpdir, filename);
  fs.writeFileSync(tmpfile, code);

  const uri = Uri.file(tmpfile);
  program.addTrackedFile(uri);

  // eslint-disable-next-line no-empty
  while (program.analyze()) {}

  const sourceFile = program.getSourceFile(uri)!;
  return {
    program,
    sourceFile,
    clean: () => {
      cleanup();
    },
  };
}

export function getSpecialNodeMap(program: Program, sourceFile: SourceFile) {
  const parseResult = sourceFile.getParseResults();
  expect(parseResult).toBeDefined();
  const parseTree = parseResult!.parseTree;

  const walker = new TypeSearcher(program.evaluator!);
  walker.walk(parseTree);
  return walker.specialNodeMap;
}

export function getTmpDir() {
  const tmpdir = path.join(os.tmpdir(), "pluto-test-" + randomUUID());
  fs.ensureDirSync(tmpdir);
  return { tmpdir, cleanup: () => fs.removeSync(tmpdir) };
}

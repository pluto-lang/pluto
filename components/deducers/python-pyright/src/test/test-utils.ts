import * as path from "path";
import { Uri } from "pyright-internal/dist/common/uri/uri";
import { Program } from "pyright-internal/dist/analyzer/program";
import { LogLevel } from "pyright-internal/dist/common/console";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";

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

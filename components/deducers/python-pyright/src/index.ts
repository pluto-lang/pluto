import * as path from "path";
import { Uri } from "pyright-internal/dist/common/uri/uri";
import { DeduceResult, Deducer } from "@plutolang/base/core";
import { Program } from "pyright-internal/dist/analyzer/program";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { LogLevel } from "pyright-internal/dist/common/console";

import * as TextUtils from "./text-utils";
import * as ProgramUtils from "./program-utils";
import { TypeSearcher } from "./type-searcher";

export default class PyrightDeducer extends Deducer {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(path.join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(path.join(__dirname, "../package.json")).version;

  public deduce(entrypoints: string[]): Promise<DeduceResult> {
    const program = ProgramUtils.createProgram({
      logLevel: LogLevel.Warn,
      extraPaths: [
        path.resolve(__dirname, "../../../../packages/base-py"),
        path.resolve(__dirname, "../../../../packages/pluto-py"),
      ],
    });

    const fileUris = entrypoints.map((name) => Uri.file(name));
    program.setTrackedFiles(fileUris);

    // eslint-disable-next-line no-empty
    while (program.analyze()) {}

    const sourceFile = program.getSourceFile(fileUris[0])!;
    doTypeSearch(program, sourceFile);

    program.dispose();
    return {} as any;
  }
}

function doTypeSearch(program: Program, sourceFile: SourceFile) {
  const parseResult = sourceFile.getParseResults();
  if (!parseResult) {
    throw new Error("No parse result");
  }
  const parseTree = parseResult.parseTree;

  const walker = new TypeSearcher(program.evaluator!, sourceFile);
  walker.walk(parseTree);

  console.log(walker.specialNodeMap.size, "types of special nodes found.");
  walker.specialNodeMap.forEach((nodes, key) => {
    console.log("Special Node:", key);
    nodes.forEach((node) => {
      console.log("  ", TextUtils.getTextOfNode(node, sourceFile));
    });
  });
}

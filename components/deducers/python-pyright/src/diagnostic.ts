import { ParseNode } from "pyright-internal/dist/parser/parseNodes";
import { Writable } from "stream";
import { getPosition } from "./common/position-utils";

export enum DiagnosticCategory {
  Warning = 0,
  Error = 1,
}

export interface Diagnostic {
  readonly source: string;
  readonly node: ParseNode;
  readonly category: DiagnosticCategory;
  readonly message: string;
}

export namespace Diagnostic {
  export function print(diagnostic: Diagnostic, log?: Writable) {
    log = log ?? process.stdout;

    const pos = getPosition(diagnostic.node);
    const diagnosticType = diagnostic.category === DiagnosticCategory.Error ? "Error" : "Warning";

    log.write(`${diagnosticType}: ${diagnostic.message}\n`);
    log.write(`    at ${diagnostic.source}:${pos.line + 1}:${pos.character + 1}\n`);
  }
}

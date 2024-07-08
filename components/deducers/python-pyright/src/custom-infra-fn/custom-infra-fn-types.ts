import { Scope } from "pyright-internal/dist/analyzer/scope";
import { ParseNode } from "pyright-internal/dist/parser/parseNodes";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";

export interface CustomInfraFn {
  readonly topNode: ParseNode;
  readonly hierarchy: Scope[];
  readonly sourceFile: SourceFile;
}

import assert from "node:assert";
import { getScopeForNode } from "pyright-internal/dist/analyzer/scopeUtils";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { CallNode } from "pyright-internal/dist/parser/parseNodes";

export function inGlobalScope(node: CallNode, sourceFile: SourceFile): boolean {
  const scope = getScopeForNode(node);
  const parseTree = sourceFile.getParseResults()?.parseTree;
  assert(parseTree, "No parse tree found in source file.");
  const globalScope = getScopeForNode(parseTree!);
  return scope === globalScope;
}

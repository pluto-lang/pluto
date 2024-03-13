import assert from "node:assert";
import * as ScopeUtils from "pyright-internal/dist/analyzer/scopeUtils";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { CallNode } from "pyright-internal/dist/parser/parseNodes";

export function inGlobalScope(node: CallNode, sourceFile: SourceFile): boolean {
  const scope = ScopeUtils.getScopeForNode(node);
  const parseTree = sourceFile.getParseResults()?.parseTree;
  assert(parseTree, "No parse tree found in source file.");
  const globalScope = ScopeUtils.getScopeForNode(parseTree!);
  return scope === globalScope;
}

export const isScopeContainedWithin = ScopeUtils.isScopeContainedWithin;

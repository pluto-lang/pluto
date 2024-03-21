import assert from "node:assert";
import { Scope } from "pyright-internal/dist/analyzer/scope";
import { Symbol } from "pyright-internal/dist/analyzer/symbol";
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

export function getScopeForSymbol(symbol: Symbol): Scope | undefined {
  const decls = symbol.getDeclarations();
  if (decls.length === 0) {
    return undefined;
  }
  return ScopeUtils.getScopeForNode(decls[0].node);
}

export const isScopeContainedWithin = ScopeUtils.isScopeContainedWithin;

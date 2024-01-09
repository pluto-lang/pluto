import ts from "typescript";
import { Location } from "../types";
import { ImportStore, extractImportElements } from "../imports";
import { FN_RESOURCE_TYPE_NAME, PLUTO_BASE_PKG, RESOUCE_TYPE_NAME } from "../constants";

export function isPrimitive(val: string): boolean {
  const primitiveTypes = [
    "string",
    "number",
    "boolean",
    "undefined",
    "symbol",
    "bigint",
    "void",
    "any",
    "unknown",
  ];
  return primitiveTypes.indexOf(val) !== -1;
}

export function getLocationOfNode(node: ts.Node, depth = -1): Location {
  const sourceFile = node.getSourceFile();
  const startPos = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
  const startPosStr = `(${startPos.line},${startPos.character})`;
  const endPos = ts.getLineAndCharacterOfPosition(sourceFile, node.getEnd());
  const endPosStr = `(${endPos.line},${endPos.character})`;
  const loc: Location = {
    file: sourceFile.fileName,
    depth: depth,
    start: startPosStr,
    end: endPosStr,
  };
  return loc;
}

/**
 * Check if a variable is a resource.
 */
export function isResourceVar(node: ts.Node, checker: ts.TypeChecker): boolean {
  const type = checker.getTypeAtLocation(node);
  if (type == undefined) {
    return false;
  }

  const decls = type.symbol?.declarations;
  return (
    decls != undefined &&
    (ts.isClassDeclaration(decls[0]) || ts.isInterfaceDeclaration(decls[0])) &&
    isResourceType(decls[0], checker)
  );
}

/**
 * Check if a type is function.
 */
export function isFunctionType(type: ts.Type): boolean {
  const flags =
    ts.TypeFlags.Any |
    ts.TypeFlags.Unknown |
    ts.TypeFlags.Void |
    ts.TypeFlags.Undefined |
    ts.TypeFlags.Null |
    ts.TypeFlags.Never |
    ts.TypeFlags.Intersection |
    ts.TypeFlags.Union |
    ts.TypeFlags.Index;
  return type.getCallSignatures().length > 0 && (type.getFlags() & flags) === 0;
}

/**
 * Check if the declaration implements or extends the Resource interaface.
 * First, analyze the import dependencies of the source file for the current type node.
 * Then, check if the base types of this declaration are from the Resource interface in the plutolang base package.
 * If not, recursively check each base type.
 */
export function isResourceType(
  declNode: ts.ClassDeclaration | ts.InterfaceDeclaration,
  checker: ts.TypeChecker,
  fnResource: boolean = false
): boolean {
  const targetTypeName = fnResource ? FN_RESOURCE_TYPE_NAME : RESOUCE_TYPE_NAME;

  // Analyze the import dependencies of the source file for the current type node.
  // If the type node implements the Resource interface, we can use this analysis result to
  // verify if the Resource interface belongs to plutolang.
  const importStore = new ImportStore();
  const sourceFile = declNode.getSourceFile();
  const importStats = sourceFile.statements
    .filter(ts.isImportDeclaration)
    .flatMap((stmt) => extractImportElements(sourceFile, stmt));
  importStore.update(importStats);

  let found = false;
  declNode.heritageClauses?.forEach((clause) => {
    if (found) {
      return;
    }

    // Check every type in the implementation and extension clauses.
    for (const typeNode of clause.types) {
      const identifier = typeNode.expression;
      if (identifier.getText() == targetTypeName) {
        const elem = importStore.searchElement(targetTypeName);
        if (elem?.package == PLUTO_BASE_PKG) {
          found = true;
          return;
        }
      }

      // Obtain the declaration of the base type. Then, proceed to recursively verify
      // if it implements or extends the Resource interface.
      const symbol = checker.getSymbolAtLocation(identifier);
      if (symbol == undefined || symbol.declarations == undefined) {
        continue;
      }
      for (const decl of symbol.declarations) {
        if (!ts.isClassDeclaration(decl) && !ts.isInterfaceDeclaration(decl)) {
          continue;
        }
        if (isResourceType(decl, checker, fnResource)) {
          found = true;
          return;
        }
      }
    }
  });
  return found;
}

/**
 * Check if a symbol is a constant variable.
 */
export function isConstVar(symbol: ts.Symbol): boolean {
  const symbolDeclaration = symbol.valueDeclaration || symbol.declarations?.[0];
  return (
    !!symbolDeclaration &&
    ts.isVariableDeclaration(symbolDeclaration) &&
    ts.isVariableDeclarationList(symbolDeclaration.parent) &&
    symbolDeclaration.parent.flags === ts.NodeFlags.Const
  );
}

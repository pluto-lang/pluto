import ts from "typescript";
import { ImportElement, ImportStore } from "./imports";
import { isPrimitive } from "./utils";

export function resolveImportDeps(
  sourceFile: ts.SourceFile,
  importStore: ImportStore,
  fnNode: ts.Node
): ImportElement[] {
  // Iterate through all nodes in this function.
  const resolveNodeDeps = (node: ts.Node): ImportElement[] => {
    let dep: ImportElement | undefined;
    if (ts.isTypeNode(node)) {
      dep = resolveTypeNode(sourceFile, node, importStore);
    } else if (ts.isNewExpression(node)) {
      dep = resolveNewExpression(sourceFile, node, importStore);
    } else if (ts.isPropertyAccessExpression(node)) {
      dep = resolvePropertyAccessExpression(sourceFile, node, importStore);
    }

    const deps: ImportElement[] = [];
    if (dep) {
      deps.push(dep);
    }

    node.forEachChild((node) => {
      deps.push(...resolveNodeDeps(node));
    });
    return deps;
  };

  let deps = resolveNodeDeps(fnNode);
  // remove duplicate
  deps = deps.filter((obj1, obj2, arr) => arr.findIndex((val) => val.name === obj1.name) === obj2);
  return deps;
}

// If this node is a TypeNode and it is not a Promise, return the discovery.
function resolveTypeNode(
  sourceFile: ts.SourceFile,
  node: ts.TypeNode,
  importStore: ImportStore
): ImportElement | undefined {
  const typeName = node.getText(sourceFile);
  if (typeName.startsWith("Promise")) {
    return;
  }

  // If the type format is 'ns.type', search for the first part.
  const elemName = typeName.split(".")[0];
  if (isPrimitive(elemName)) {
    return;
  }

  const elem = importStore.searchElement(elemName);
  if (elem == undefined) {
    throw new Error(`Cannot find the type from import elements: ${typeName}.`);
  }
  return elem;
}

// Process for new expression, such as `new Cls()`.
function resolveNewExpression(
  sourceFile: ts.SourceFile,
  node: ts.NewExpression,
  importStore: ImportStore
): ImportElement | undefined {
  const typeName = node.expression.getText(sourceFile);
  // Will be processed as PropertyAccessExpression
  if (typeName.indexOf(".") !== -1) {
    return;
  }
  return importStore.searchElement(typeName);
}

// Process for property access expression, such as:
//   1. `pkg.access()`
//   2. `pkg.prop`
//   3. `obj.access()`
//   4. `obj.prop`
function resolvePropertyAccessExpression(
  sourceFile: ts.SourceFile,
  node: ts.PropertyAccessExpression,
  importStore: ImportStore
): ImportElement | undefined {
  // Handle formats that package property access, such as 'pkg.access', but ignore object property access.
  const callerName = node.expression.getText(sourceFile);
  const elemName = callerName.split(".")[0];
  return importStore.searchElement(elemName);
}

import ts from "typescript";
import { ImportElement, ImportStore } from "./imports";

export function resolveImportDeps(
  sourceFile: ts.SourceFile,
  importStore: ImportStore,
  fnNode: ts.Node
): ImportElement[] {
  // Iterate through all nodes in this function.
  const resolveNodeDeps = (node: ts.Node): ImportElement[] => {
    let deps: ImportElement[] = [];
    if (ts.isTypeNode(node)) {
      deps = resolveTypeNode(sourceFile, node, importStore) ?? [];
    } else if (ts.isNewExpression(node)) {
      const dep = resolveNewExpression(sourceFile, node, importStore);
      if (dep != undefined) deps.push(dep);
    } else if (ts.isPropertyAccessExpression(node)) {
      const dep = resolvePropertyAccessExpression(sourceFile, node, importStore);
      if (dep != undefined) deps.push(dep);
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
): ImportElement[] | undefined {
  const typeName = node.getText(sourceFile);
  if (typeName.startsWith("Promise")) {
    return;
  }

  const atomicTypeNames: string[] = [];
  const que: ts.Node[] = [node];
  while (que.length > 0) {
    const cur = que.shift()!;
    if (ts.isTypeNode(cur) && cur.getChildCount() == 1) {
      // If the type format is 'ns.type', search for the first part.
      const elemName = typeName.split(".")[0];
      atomicTypeNames.push(elemName);
    } else {
      que.push(...cur.getChildren());
    }
  }
  if (atomicTypeNames.length == 0) {
    return;
  }

  const elements = atomicTypeNames.map((elemName) => {
    const elem = importStore.searchElement(atomicTypeNames[0]);
    if (elem == undefined) {
      throw new Error(`Cannot find the type from import elements: ${elemName}.`);
    }
    return elem;
  });
  return elements;
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

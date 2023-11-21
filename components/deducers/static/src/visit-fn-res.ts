import ts from "typescript";
import { arch } from "@plutolang/base";
import {
  ResourceRelatVarUnion,
  ResourceRelationshipInfo,
  ResourceVariableInfo,
  Location,
} from "./types";
import { ImportElement, buildImportStore } from "./imports";
import { resolveImportDeps } from "./dep-resolve";
import { FN_RESOURCE_TYPE_NAME } from "./constants";
import { getLocationOfNode, isConstVar, isResourceVar } from "./utils";

/**
 * Construct the FnResource and detect the access relationship within the body of FnResource.
 * @param fnNode The function expression
 * @param fnResName The function name, same with the resource name.
 */
export function visitFnResourceBody(
  fnNode: ts.Expression,
  checker: ts.TypeChecker,
  fnResName: string
): ResourceRelatVarUnion {
  // Get the import dependencies for this function.
  const importStore = buildImportStore(fnNode.getSourceFile());
  const importElements: ImportElement[] = resolveImportDeps(
    fnNode.getSourceFile(),
    importStore,
    fnNode
  );

  const fnLoc = getLocationOfNode(fnNode, 0);
  const constDepLocs = removeDuplicateLocs(detectFnAccessConst(fnNode, checker, 0));
  if (new Set(constDepLocs.concat(fnLoc).map((loc) => loc.file)).size != 1) {
    throw new Error(`Currently, Pluto only supports a single file.`);
  }
  const resourceVarInfo: ResourceVariableInfo = {
    varName: fnResName,
    resourceConstructInfo: {
      constructExpression: FN_RESOURCE_TYPE_NAME,
      importElements: importElements,
      locations: [fnLoc].concat(constDepLocs),
    },
  };

  // Detect the access relationship within the body of FnResource.
  // This information will be utilized to generate the permission configuration for this FnResource.
  const relatInfos = detectFnAccessResource(fnNode, checker, fnResName);
  return {
    resourceVarInfos: [resourceVarInfo],
    resourceRelatInfos: relatInfos,
  };
}

function detectFnAccessResource(
  fnNode: ts.Expression,
  checker: ts.TypeChecker,
  fnResName: string
): ResourceRelationshipInfo[] {
  const resRelatInfos: ResourceRelationshipInfo[] = [];
  const exists = new Set<string>();

  const checkPermission = (node: ts.Node) => {
    let propAccessExp;
    // Write operation, e.g. state.set(), queue.push()
    if (
      ts.isExpressionStatement(node) &&
      ts.isAwaitExpression(node.expression) &&
      ts.isCallExpression(node.expression.expression) &&
      ts.isPropertyAccessExpression(node.expression.expression.expression)
    ) {
      propAccessExp = node.expression.expression.expression;
    } else if (ts.isVariableStatement(node)) {
      // Read operation, e.g. state.get()
      const initExp = node.declarationList.declarations[0].initializer;
      if (
        initExp &&
        ts.isAwaitExpression(initExp) &&
        ts.isCallExpression(initExp.expression) &&
        ts.isPropertyAccessExpression(initExp.expression.expression)
      ) {
        propAccessExp = initExp.expression.expression;
      }
    }
    if (!propAccessExp || !isResourceVar(propAccessExp.expression, checker)) {
      return;
    }

    const accessorName = propAccessExp.expression.getText();
    const symbol = checker.getSymbolAtLocation(propAccessExp);
    if (symbol == undefined) {
      throw new Error("The symbol of this function call is undefined: " + propAccessExp.getText());
    }
    const fnName = checker.symbolToString(symbol);

    const key = `${accessorName}-${fnName}`;
    if (exists.has(key)) {
      return;
    }
    const resRelatInfo: ResourceRelationshipInfo = {
      fromVarName: fnResName,
      toVarNames: [accessorName],
      type: arch.RelatType.ACCESS,
      operation: fnName,
      parameters: [],
    };
    resRelatInfos.push(resRelatInfo);
    exists.add(key);
  };

  const fnBody = fnNode.getChildAt(fnNode.getChildCount() - 1);
  const que = [fnBody];
  while (que.length > 0) {
    const cur = que.shift()!;
    cur.forEachChild((child) => {
      checkPermission(child);
      que.push(child);
    });
  }
  return resRelatInfos;
}

function detectFnAccessConst(curNode: ts.Node, checker: ts.TypeChecker, depth: number): Location[] {
  const curFile = curNode.getSourceFile().fileName;
  const curScope = [curNode.getStart(), curNode.getEnd()];

  const locs: Location[] = [];
  const fetchConstVar = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      // Check if this identifier is a constant variable.
      if (!symbol || !isConstVar(symbol) || isResourceVar(node, checker)) {
        return;
      }

      const type = checker.getTypeOfSymbol(symbol);
      if (!type.isLiteral()) {
        throw new Error(
          "Currently, Pluto only supports accessing constant variables with literal values that are outside the scope of a function."
        );
      }

      // If this is a constant variable that is defined inside the scope of this function, we can ignore it.
      const declStat = getSymbolDeclStatement(symbol);
      if (
        (declStat.getSourceFile().fileName.indexOf("node_modules") === -1 &&
          declStat.getSourceFile().fileName != curFile) ||
        declStat.getStart() > curScope[1] ||
        declStat.getEnd() < curScope[0]
      ) {
        const declLoc = getLocationOfNode(declStat, depth + 1);
        locs.push(declLoc);
        locs.push(...detectFnAccessConst(declStat, checker, depth + 1));
      }
    }
  };

  const que = [curNode];
  while (que.length > 0) {
    const cur = que.shift()!;
    cur.forEachChild((child) => {
      fetchConstVar(child);
      que.push(child);
    });
  }
  return locs;
}

function getSymbolDeclStatement(symbol: ts.Symbol): ts.Statement {
  const symbolDeclaration = symbol.valueDeclaration || symbol.declarations?.[0];
  if (symbolDeclaration == undefined) {
    throw new Error("Cannot found the declaration of symbol: " + symbol.name);
  }

  let parNode: ts.Node = symbolDeclaration;
  while (!ts.isStatement(parNode)) {
    parNode = parNode.parent;
  }
  return parNode;
}

function removeDuplicateLocs(oldLocs: Location[]): Location[] {
  const newLocs: Location[] = [];
  for (const oldLoc of oldLocs) {
    let existed = false;
    for (const newLoc of newLocs) {
      if (oldLoc.file != newLoc.file || oldLoc.start != newLoc.start || oldLoc.end != newLoc.end) {
        continue;
      }
      existed = true;
      newLoc.depth = Math.min(newLoc.depth, oldLoc.depth);
    }
    if (!existed) newLocs.push(oldLoc);
  }
  return newLocs;
}

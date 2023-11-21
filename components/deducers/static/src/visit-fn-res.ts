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
  // Visit this function body, and detect the variable accessing, function calling and resource using in the access chain.
  const detectResult = detectAccessChain(fnNode, checker, fnResName, 0);
  if (!detectResult) {
    throw new Error("This detection should not be undefined.");
  }
  if (new Set(detectResult?.depLocs.concat(fnLoc).map((loc) => loc.file)).size != 1) {
    throw new Error(`Currently, Pluto only supports a single file.`);
  }

  const depLocs = removeDuplicateLocs(detectResult.depLocs);
  // Consturct the Fn Resource.
  const resourceVarInfo: ResourceVariableInfo = {
    varName: fnResName,
    resourceConstructInfo: {
      constructExpression: FN_RESOURCE_TYPE_NAME,
      importElements: importElements,
      locations: [fnLoc].concat(depLocs),
    },
  };
  const relatInfos = removeDuplicateRelatInfos(detectResult.resRelatInfos);

  return {
    resourceVarInfos: [resourceVarInfo],
    resourceRelatInfos: relatInfos,
  };
}

interface DetectFnAccessChainResult {
  resRelatInfos: ResourceRelationshipInfo[];
  depLocs: Location[];
}

function combineDetectFnAccessChainResults(
  ...results: (DetectFnAccessChainResult | undefined)[]
): DetectFnAccessChainResult {
  const resRelatInfos: ResourceRelationshipInfo[] = [];
  const depLocs: Location[] = [];
  results.forEach((result) => {
    if (!result) return;
    resRelatInfos.push(...result.resRelatInfos);
    depLocs.push(...result.depLocs);
  });
  return {
    resRelatInfos,
    depLocs,
  };
}

/**
 * Based on the type of current node, detect three types of accesses:
 *   1. If this node is an identifier, check if it is a constant variable located outside of this node scope.
 *      If yes, add its declation location into the dependency list.
 *   2. If this node is a call expression, check if it is a function call located outside of this node scope.
 *      If yes, add its declaration location into the dependency list.
 *   3. If this node is a variable statement or expression statement, check if it is a resource variable.
 *      If yes, establish a relationship between the root FnResource in the chain and the target resource.
 */
function detectAccessChain(
  curNode: ts.Node,
  checker: ts.TypeChecker,
  rootFnName: string,
  depth: number
): DetectFnAccessChainResult | undefined {
  const curFile = curNode.getSourceFile().fileName;
  if (curFile.indexOf("node_modules") !== -1) return;

  let combinedRes: DetectFnAccessChainResult | undefined;
  if (ts.isIdentifier(curNode)) {
    // Might be accessing a constant variable located outside of scope.
    combinedRes = detectFnAccessConst(curNode, checker, rootFnName, depth);
  } else if (ts.isCallExpression(curNode)) {
    // Might be calling function located outside of scope.
    combinedRes = detectFnAccessFn(curNode, checker, rootFnName, depth);
  } else if (ts.isExpressionStatement(curNode) || ts.isVariableStatement(curNode)) {
    // Might be calling a resource method.
    combinedRes = detectFnAccessResource(curNode, checker, rootFnName);
  }

  curNode.forEachChild((childNode) => {
    const result = detectAccessChain(childNode, checker, rootFnName, depth);
    combinedRes = combineDetectFnAccessChainResults(combinedRes, result);
  });

  return combinedRes;
}

/**
 * Check if this node is using resource.
 * This information will be utilized to generate the permission configuration for this FnResource.
 */
function detectFnAccessResource(
  curNode: ts.Node,
  checker: ts.TypeChecker,
  fnResName: string
): DetectFnAccessChainResult | undefined {
  let propAccessExp;
  // Write operation, e.g. state.set(), queue.push()
  if (
    ts.isExpressionStatement(curNode) &&
    ts.isAwaitExpression(curNode.expression) &&
    ts.isCallExpression(curNode.expression.expression) &&
    ts.isPropertyAccessExpression(curNode.expression.expression.expression)
  ) {
    propAccessExp = curNode.expression.expression.expression;
  } else if (ts.isVariableStatement(curNode)) {
    // Read operation, e.g. state.get()
    const initExp = curNode.declarationList.declarations[0].initializer;
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

  const resRelatInfo: ResourceRelationshipInfo = {
    fromVarName: fnResName,
    toVarNames: [accessorName],
    type: arch.RelatType.ACCESS,
    operation: fnName,
    parameters: [],
  };
  return {
    resRelatInfos: [resRelatInfo],
    depLocs: [],
  };
}

/**
 * Check if this node is a variable located outside of this node scope.
 * If yes, add its declaration location into the dependency list.
 */
function detectFnAccessConst(
  curNode: ts.Node,
  checker: ts.TypeChecker,
  rootFnName: string,
  depth: number
): DetectFnAccessChainResult | undefined {
  const curFile = curNode.getSourceFile().fileName;
  const curScope = [curNode.getStart(), curNode.getEnd()];

  const symbol = checker.getSymbolAtLocation(curNode);
  // Check if this identifier is a constant variable.
  if (!symbol || !isConstVar(symbol) || isResourceVar(curNode, checker)) {
    return;
  }

  const type = checker.getTypeOfSymbol(symbol);
  if (!type.isLiteral()) {
    throw new Error(
      "Currently, Pluto only supports accessing constant variables with literal values that are outside the scope of a function."
    );
  }

  let combinedRes: DetectFnAccessChainResult = { resRelatInfos: [], depLocs: [] };
  // If this is a constant variable that is defined inside the scope of this function, we can ignore it.
  const declStat = getSymbolDeclStatement(symbol);
  if (
    (declStat.getSourceFile().fileName.indexOf("node_modules") === -1 &&
      declStat.getSourceFile().fileName != curFile) ||
    declStat.getStart() > curScope[1] ||
    declStat.getEnd() < curScope[0]
  ) {
    const declLoc = getLocationOfNode(declStat, depth + 1);
    combinedRes.depLocs.push(declLoc);
    const childResult = detectAccessChain(declStat, checker, rootFnName, depth + 1);
    combinedRes = combineDetectFnAccessChainResults(combinedRes, childResult);
  }
  return combinedRes;
}

/**
 * Check if this node is an expression that calls a function located outside the scope of this node.
 * If yes, add its declaration location into the dependency list.
 */
function detectFnAccessFn(
  curNode: ts.Node,
  checker: ts.TypeChecker,
  rootFnName: string,
  depth: number
): DetectFnAccessChainResult | undefined {
  const curFile = curNode.getSourceFile().fileName;
  const curScope = [curNode.getStart(), curNode.getEnd()];

  if (!ts.isCallExpression(curNode)) {
    return;
  }

  const fnExpression = curNode.expression;
  const symbol = checker.getSymbolAtLocation(fnExpression);
  if (!symbol) {
    return;
  }

  const declStat = getSymbolDeclStatement(symbol);
  if (
    declStat.getSourceFile().fileName.indexOf("node_modules") !== -1 ||
    (declStat.getSourceFile().fileName == curFile &&
      declStat.getStart() > curScope[0] &&
      declStat.getEnd() < curScope[1])
  ) {
    // If the function being called is a library function or if it is defined within the scope of this function, we can disregard it.
    return;
  }

  if (ts.isPropertyAccessExpression(fnExpression)) {
    let headNode = fnExpression.expression;
    while (ts.isPropertyAccessExpression(headNode)) {
      headNode = headNode.expression;
    }
    if (isResourceVar(headNode, checker)) {
      return;
    }
    throw new Error("Currently, Pluto doesn't support property calling.");
  }

  let combinedRes: DetectFnAccessChainResult = { resRelatInfos: [], depLocs: [] };
  const declLoc = getLocationOfNode(declStat, depth + 1);
  combinedRes.depLocs.push(declLoc);
  const childResult = detectAccessChain(declStat, checker, rootFnName, depth + 1);
  combinedRes = combineDetectFnAccessChainResults(combinedRes, childResult);
  return combinedRes;
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

/**
 * Remove duplicate relationship information.
 */
function removeDuplicateRelatInfos(
  oldRelatInfos: ResourceRelationshipInfo[]
): ResourceRelationshipInfo[] {
  const existedKeys = new Set<string>();
  const newRelatInfos: ResourceRelationshipInfo[] = [];
  for (const relatInfo of oldRelatInfos) {
    const key = `${relatInfo.operation}-${relatInfo.fromVarName}-${relatInfo.toVarNames.join("")}`;
    if (existedKeys.has(key)) continue;
    newRelatInfos.push(relatInfo);
    existedKeys.add(key);
  }
  return newRelatInfos;
}

import ts from "typescript";
import { arch } from "@plutolang/base";
import { ResourceRelationshipInfo, VisitResult, concatVisitResult } from "./types";
import { isFunctionType, isResourceVar } from "./utils";
import { visitAssignmentExpression } from "./visit-var-def";
import { visitCallingArguments } from "./visit-calling-arguments";

/**
 * Check if this expression is doing something about resource, including:
 *   1. Create a new resource and assign it to a variable.
 *   2. Invoke a resource method.
 */
export function visitExpression(
  parNode: ts.ExpressionStatement,
  checker: ts.TypeChecker
): VisitResult | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit an ExpressionStatement: `, parNode.getText());
  }

  let visitResult: VisitResult | undefined;

  const childNode = parNode.expression;
  if (ts.isBinaryExpression(childNode)) {
    const result = visitBinaryExpression(childNode, checker);
    visitResult = concatVisitResult(visitResult, result);
  }

  if (ts.isCallExpression(childNode)) {
    const result = visitCallExpression(childNode, checker);
    visitResult = concatVisitResult(visitResult, result);
  }

  return visitResult;
}

export function visitCallExpression(
  parNode: ts.CallExpression,
  checker: ts.TypeChecker
): VisitResult | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit a CallExpression: `, parNode.getText());
  }

  // Check if the expression is a function call.
  const type = checker.getTypeAtLocation(parNode.expression);
  if (!isFunctionType(type)) {
    return;
  }

  // Get the first parameter, and check if it is a resource variable.
  let headNode = parNode.expression;
  while (ts.isPropertyAccessExpression(headNode)) {
    headNode = headNode.expression;
  }
  if (!isResourceVar(headNode, checker)) {
    const { line, character } = ts.getLineAndCharacterOfPosition(
      parNode.getSourceFile(),
      parNode.getStart()
    );
    throw new Error(
      `${parNode.getSourceFile().fileName} (${line + 1},${
        character + 1
      }): Currently, Pluto only allows direct access to resources, e.g. router.get(...)`
    );
  }

  // Get the function signature
  const signature = checker.getResolvedSignature(parNode);
  if (signature == undefined) {
    throw new Error(`Cannot get resolved signature:  + ${parNode.getText()}`);
  }
  const { closureInfos, closureDependencies, parameters } = visitCallingArguments(
    signature,
    parNode.arguments,
    checker
  );

  // Construct the relationship information for this function call.
  const accessorName = headNode.getText();
  const symbol = checker.getSymbolAtLocation(parNode.expression);
  if (symbol == undefined) {
    throw new Error("The symbol of this function call is undefined: " + parNode.getText());
  }
  const fnName = checker.symbolToString(symbol);

  const resRelatInfo: ResourceRelationshipInfo = {
    fromVarName: accessorName,
    toVarNames: closureInfos.map((r) => r.varName),
    type: arch.RelatType.Create,
    operation: fnName,
    parameters: parameters,
  };
  return {
    resourceRelatInfos: [resRelatInfo].concat(...closureDependencies),
    resourceVarInfos: closureInfos,
  };
}

/**
 * Recursively visit the binary expression.
 */
export function visitBinaryExpression(
  parNode: ts.BinaryExpression,
  checker: ts.TypeChecker
): VisitResult | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit a BinaryExpression: `, parNode.getText());
  }

  // const resVarInfos: ResourceVariableInfo[] = [];
  // Check if this is an assignment expression.
  // e.g. x = new MyClass();
  if (parNode.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const visitResult = visitAssignmentExpression(parNode, checker);
    return visitResult;
  }

  if (parNode.operatorToken.kind !== ts.SyntaxKind.CommaToken) {
    console.warn("The operator token is not '=' or ',', please check if the result is valid.");
  }

  let visitResult: VisitResult | undefined;
  const leftNode = parNode.left;
  const rightNode = parNode.right;

  // FIXME: might not be a binary expression, instead, it could be a call expression
  if (ts.isBinaryExpression(leftNode)) {
    const result = visitBinaryExpression(leftNode, checker);
    visitResult = concatVisitResult(visitResult, result);
  } else {
    throw new Error("The left node of the binary expression is not a binary expression.");
  }

  if (ts.isBinaryExpression(rightNode)) {
    const result = visitBinaryExpression(rightNode, checker);
    visitResult = concatVisitResult(visitResult, result);
  } else {
    throw new Error("The left node of the binary expression is not a binary expression.");
  }

  return visitResult;
}

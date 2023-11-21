import * as ts from "typescript";
import { arch } from "@plutolang/base";
import {
  ParameterInfo,
  ResourceRelatVarUnion,
  ResourceRelationshipInfo,
  ResourceVariableInfo,
} from "./types";
import { isFunctionType, isResourceType, isResourceVar } from "./utils";
import { visitFnResourceBody } from "./visit-fn-res";
import { visitAssignmentExpression } from "./visit-var-def";

/**
 * Check if this expression is doing something about resource, including:
 *   1. Create a new resource and assign it to a variable.
 *   2. Invoke a resource method.
 */
export function visitExpression(
  parNode: ts.ExpressionStatement,
  checker: ts.TypeChecker
): ResourceRelatVarUnion {
  if (process.env.DEBUG) {
    console.log(`Visit an ExpressionStatement: `, parNode.getText());
  }

  const resVarInfos: ResourceVariableInfo[] = [];
  const resRelatInfos: ResourceRelationshipInfo[] = [];

  const childNode = parNode.expression;
  if (ts.isBinaryExpression(childNode)) {
    const varInfos = visitBinaryExpression(childNode, checker);
    resVarInfos.push(...varInfos);
  }

  if (ts.isCallExpression(childNode)) {
    const relatVarUnion = visitCallExpression(childNode, checker);
    if (relatVarUnion != undefined) {
      resVarInfos.push(...relatVarUnion.resourceVarInfos);
      resRelatInfos.push(...relatVarUnion.resourceRelatInfos);
    }
  }

  return {
    resourceRelatInfos: resRelatInfos,
    resourceVarInfos: resVarInfos,
  };
}

export function visitCallExpression(
  parNode: ts.CallExpression,
  checker: ts.TypeChecker
): ResourceRelatVarUnion | undefined {
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

  const fnResVarInfos: ResourceVariableInfo[] = [];
  const fnAccessRelatInfos: ResourceRelationshipInfo[] = []; // Record the access relationship information that is located in the body of FnResource.

  const relatParams: ParameterInfo[] = []; // Record the argument information for this call.
  const args = parNode.arguments;
  signature.parameters.forEach((paramSig, idx) => {
    const paramName = paramSig.name;
    const arg = args[idx];
    const relatParam: ParameterInfo = { name: paramName, order: idx, expression: arg };

    const paramType = checker.getTypeOfSymbol(paramSig);
    const decls = paramType.symbol?.declarations;
    if (
      decls != undefined &&
      decls.length >= 1 &&
      (ts.isInterfaceDeclaration(decls[0]) || ts.isClassDeclaration(decls[0])) &&
      isResourceType(decls[0], checker, true)
    ) {
      // This parameter type is FnResource. Construct a resource.
      if (decls.length != 1) {
        console.warn("Found a parameter with more than one declarations: " + parNode.getText());
      }

      // Generate the fn resource name
      let fnResName = "";
      if (ts.isFunctionExpression(arg)) {
        fnResName = arg.name?.getText() ?? "";
      }
      if (fnResName == "") {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          arg.getSourceFile(),
          arg.getStart()
        );
        fnResName = `fn_${line + 1}_${character + 1}`;
      }

      const fnUnion = visitFnResourceBody(arg, checker, fnResName);
      fnResVarInfos.push(...fnUnion.resourceVarInfos);
      fnAccessRelatInfos.push(...fnUnion.resourceRelatInfos);

      relatParam.resourceName = fnResName;
      relatParams.push(relatParam);
      return;
    }

    relatParams.push(relatParam);
    return;
  });

  // Construct the relationship information for this function call.
  const accessorName = headNode.getText();
  const symbol = checker.getSymbolAtLocation(parNode.expression);
  if (symbol == undefined) {
    throw new Error("The symbol of this function call is undefined: " + parNode.getText());
  }
  const fnName = checker.symbolToString(symbol);

  const resRelatInfo: ResourceRelationshipInfo = {
    fromVarName: accessorName,
    toVarNames: fnResVarInfos.map((r) => r.varName),
    type: arch.RelatType.CREATE,
    operation: fnName,
    parameters: relatParams,
  };
  return {
    resourceRelatInfos: [resRelatInfo].concat(...fnAccessRelatInfos),
    resourceVarInfos: fnResVarInfos,
  };
}

/**
 * Recursively visit the binary expression.
 */
export function visitBinaryExpression(
  parNode: ts.BinaryExpression,
  checker: ts.TypeChecker
): ResourceVariableInfo[] {
  if (process.env.DEBUG) {
    console.log(`Visit a BinaryExpression: `, parNode.getText());
  }

  const resVarInfos: ResourceVariableInfo[] = [];
  // Check if this is an assignment expression.
  // e.g. x = new MyClass();
  if (parNode.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const resVarInfo = visitAssignmentExpression(parNode, checker);
    if (resVarInfo != undefined) {
      resVarInfos.push(resVarInfo);
    }
    return resVarInfos;
  }

  if (parNode.operatorToken.kind !== ts.SyntaxKind.CommaToken) {
    console.warn("The operator token is not '=' or ',', please check if the result is valid.");
  }

  const leftNode = parNode.left;
  const rightNode = parNode.right;
  // FIXME: might not be a binary expression, instead, it could be a call expression
  if (ts.isBinaryExpression(leftNode)) {
    resVarInfos.push(...visitBinaryExpression(leftNode, checker));
  } else {
    throw new Error("The left node of the binary expression is not a binary expression.");
  }
  if (ts.isBinaryExpression(rightNode)) {
    resVarInfos.push(...visitBinaryExpression(rightNode, checker));
  } else {
    throw new Error("The left node of the binary expression is not a binary expression.");
  }
  return resVarInfos;
}

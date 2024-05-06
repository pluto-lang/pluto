import ts from "typescript";
import { buildImportStore } from "./imports";
import { getLocationOfNode, isResourceType } from "./utils";
import { visitCallingArguments } from "./visit-calling-arguments";
import { ResourceVariableInfo, VisitResult, concatVisitResult } from "./types";

/**
 * Check if this variable declaration is defining a resource. If it is,
 * retrieve the name of the variable and its construction details.
 */
export function visitVariableStatement(
  parNode: ts.VariableStatement,
  checker: ts.TypeChecker
): VisitResult | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit a VariableStatement: `, parNode.getText());
  }

  let visitResult: VisitResult | undefined;
  parNode.declarationList.declarations.forEach((declaration) => {
    if (declaration.initializer == undefined) {
      // This is a variable declaration without initial value.
      // e.g. let x;
      return;
    }

    if (ts.isNewExpression(declaration.initializer)) {
      // This is a constructor call. May resource initialization.
      // e.g. new MyClass()

      const varName = declaration.name;
      if (!ts.isIdentifier(varName)) {
        console.warn("Found a variable name that is not an identifier: ", varName.getText());
        return;
      }

      const result = visitNewExpression(declaration.initializer, checker, varName.getText());
      visitResult = concatVisitResult(visitResult, result);
    }
  });
  return visitResult;
}

/**
 * This is a binary expression with a '=' token. It may be assigning a resource to a variable.
 */
export function visitAssignmentExpression(
  parNode: ts.BinaryExpression,
  checker: ts.TypeChecker
): VisitResult | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit a visitAssignmentExpression: `, parNode.getText());
  }
  if (!ts.isNewExpression(parNode.right)) {
    return;
  }

  const varName = parNode.left.getText();
  const visitResult = visitNewExpression(parNode.right, checker, varName);
  return visitResult;
}

/**
 * Check this NewExpression is trying to construct a resource.
 * If it is, retrieve the resoruce construction information.
 */
export function visitNewExpression(
  parNode: ts.NewExpression,
  checker: ts.TypeChecker,
  varName: string
): VisitResult | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit a NewExpression: `, parNode.getText());
  }

  const type = checker.getTypeAtLocation(parNode);
  if (type.symbol == undefined) {
    console.warn(
      "The constructor type in this NewExpression does not have a symbol: ",
      parNode.getText()
    );
    return;
  }
  const clsDecl = type.symbol.valueDeclaration;
  if (clsDecl == undefined) {
    console.warn(
      "The symbol of constructor type in this NewExpression does not have a declaration: ",
      parNode.getText()
    );
    return;
  }
  if (!ts.isClassDeclaration(clsDecl)) {
    console.warn("The constructor does not belong to a class declaration: ", clsDecl.getText());
    return;
  }

  if (!isResourceType(clsDecl, checker)) {
    return;
  }

  // Analyze the import dependencies of the source file for the current node.
  // We will use this analysis result to get the import information of current resource.
  const importStore = buildImportStore(parNode.getSourceFile());
  const constructExpression = parNode.expression.getText();
  const elemName = constructExpression.split(".")[0];
  const importElement = importStore.searchElement(elemName);
  if (importElement == undefined) {
    throw new Error(
      `Cannot find the import element: ${elemName}, NewExpression: ${parNode.getText()}`
    );
  }

  // The following code is to extract the closures from the constructor arguments.
  // 1. Get the constructor signature.
  let signature: ts.Signature | undefined;
  for (const member of clsDecl.members) {
    if (ts.isConstructorDeclaration(member)) {
      signature = checker.getSignatureFromDeclaration(member);
    }
  }
  if (!signature) {
    throw new Error(`Cannot find the constructor signature: ${clsDecl.getText()}`);
  }
  // 2. Iterate through all the parameters of the constructor, and check if it is a closure. If it
  //    is, create a closure item to replace the original argument.
  const { closureInfos, closureDependencies, parameters } = visitCallingArguments(
    signature,
    parNode.arguments,
    checker
  );

  const resourceVarInfo: ResourceVariableInfo = {
    varName: varName,
    resourceName: getResourceNameFromNewExpression(checker, parNode),
    resourceConstructInfo: {
      constructExpression: constructExpression,
      importElements: [importElement],
      parameters: parameters,
      locations: [getLocationOfNode(parNode, 0)],
    },
  };
  return {
    resourceRelatInfos: closureDependencies,
    resourceVarInfos: closureInfos.concat(resourceVarInfo),
  };
}

/**
 * Get the name of the resource object. The determination of the resource object name is based on
 * the following rules:
 * 1. If there is a parameter named "name", use its value as the name ofthe resource object.
 * 2. Otherwise, use "default" as the name of the resource object.
 */
function getResourceNameFromNewExpression(
  typeChecker: ts.TypeChecker,
  node: ts.NewExpression
): string {
  // Find the index of the parameter named "name" in the constructor.
  function getNameParamIdx() {
    const signature = typeChecker.getResolvedSignature(node);
    if (!signature) {
      throw new Error(`Cannot find the signature of the NewExpression: ${node.getText()}`);
    }

    const decl = signature.getDeclaration();
    if (!decl) {
      throw new Error(`Cannot find the declaration of the NewExpression: ${node.getText()}`);
    }

    if (!ts.isConstructorDeclaration(decl)) {
      throw new Error(
        `The declaration of the NewExpression is not a constructor: ${node.getText()}`
      );
    }

    let nameParamIdx = -1;
    decl.parameters.forEach((param, idx) => {
      if (!ts.isIdentifier(param.name)) {
        return;
      }
      if (param.name.text === "name") {
        nameParamIdx = idx;
      }
    });

    return nameParamIdx;
  }

  if (node.arguments === undefined || node.arguments.length === 0) {
    // The constructor does not have any arguments.
    return "default";
  }

  const nameParamIdx = getNameParamIdx();
  if (
    nameParamIdx === -1 || // The constructor does not have a parameter named "name".
    node.arguments.length <= nameParamIdx // The constructor includes a parameter called "name", but it's not assigned.
  ) {
    return "default";
  }

  const nameArg = node.arguments[nameParamIdx];
  return nameArg.getText().replace(/(^"|"$)/g, "");
}

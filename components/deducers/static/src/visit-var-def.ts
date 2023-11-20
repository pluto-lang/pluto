import ts from "typescript";
import { ResourceConstructInfo, ResourceVariableInfo } from "./types";
import { buildImportStore } from "./imports";
import { getLocationOfNode, isResourceType } from "./utils";

/**
 * Check if this variable declaration is defining a resource. If it is,
 * retrieve the name of the variable and its construction details.
 */
export function visitVariableStatement(
  parNode: ts.VariableStatement,
  checker: ts.TypeChecker
): ResourceVariableInfo[] {
  if (process.env.DEBUG) {
    console.log(`Visit a VariableStatement: `, parNode.getText());
  }

  const resVarInfos = parNode.declarationList.declarations.map(
    (declaration): ResourceVariableInfo | undefined => {
      if (declaration.initializer == undefined) {
        // This is a variable declaration without initial value.
        // e.g. let x;
        return;
      }

      if (ts.isNewExpression(declaration.initializer)) {
        // This is a constructor call. May resource initialization.
        // e.g. new MyClass()
        const resConstInfo = visitNewExpression(declaration.initializer, checker);
        if (resConstInfo == undefined) {
          return;
        }

        const varName = declaration.name;
        if (!ts.isIdentifier(varName)) {
          console.warn("Found a variable name that is not an identifier: ", varName.getText());
          return;
        }
        return {
          varName: varName.text,
          resourceConstructInfo: resConstInfo,
        };
      }
      return;
    }
  );
  return resVarInfos.filter((v) => v !== undefined) as ResourceVariableInfo[];
}

/**
 * This is a binary expression with a '=' token. It may be assigning a resource to a variable.
 */
export function visitAssignmentExpression(
  parNode: ts.BinaryExpression,
  checker: ts.TypeChecker
): ResourceVariableInfo | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit a visitAssignmentExpression: `, parNode.getText());
  }
  if (!ts.isNewExpression(parNode.right)) {
    return;
  }

  const resConstInfo = visitNewExpression(parNode.right, checker);
  if (resConstInfo == undefined) {
    return;
  }
  const varName = parNode.left.getText();
  return {
    varName: varName,
    resourceConstructInfo: resConstInfo,
  };
}

/**
 * Check this NewExpression is trying to construct a resource.
 * If it is, retrieve the resoruce construction information.
 */
export function visitNewExpression(
  parNode: ts.NewExpression,
  checker: ts.TypeChecker
): ResourceConstructInfo | undefined {
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

  return {
    constructExpression: constructExpression,
    importElements: [importElement],
    parameters: parNode.arguments?.map((v) => v),
    location: getLocationOfNode(parNode),
  };
}

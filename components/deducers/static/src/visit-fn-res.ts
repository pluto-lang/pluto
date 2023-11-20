import ts from "typescript";
import { arch } from "@plutolang/base";
import { ResourceRelatVarUnion, ResourceRelationshipInfo, ResourceVariableInfo } from "./types";
import { ImportElement, buildImportStore } from "./imports";
import { resolveImportDeps } from "./dep-resolve";
import { FN_RESOURCE_TYPE_NAME } from "./constants";
import { getLocationOfNode, isResourceVar } from "./utils";

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

  const resourceVarInfo: ResourceVariableInfo = {
    varName: fnResName,
    resourceConstructInfo: {
      constructExpression: FN_RESOURCE_TYPE_NAME,
      importElements: importElements,
      location: getLocationOfNode(fnNode),
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

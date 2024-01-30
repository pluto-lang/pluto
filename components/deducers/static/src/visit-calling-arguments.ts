import ts from "typescript";
import { ParameterInfo, ResourceRelationshipInfo, ResourceVariableInfo } from "./types";
import { isResourceType } from "./utils";
import { visitFnResourceBody } from "./visit-fn-res";

/**
 * Visit the arguments of a function call. If the argument is a FnResource, it will be extracted as
 * a closure.
 * @param signature The signature of the function.
 * @param args The arguments of the function call.
 * @param checker The type checker.
 * @returns
 */
export function visitCallingArguments(
  signature: ts.Signature,
  args: ts.NodeArray<ts.Expression> | undefined,
  checker: ts.TypeChecker
) {
  const closureInfos: ResourceVariableInfo[] = []; // Record the closure list for this call.
  const closureDependencies: ResourceRelationshipInfo[] = []; // Record the access relationship information that is located in the body of FnResource.
  const parameters: ParameterInfo[] = []; // Record the argument information for this call.

  // If the arguments is undefined, it means that this function call does not have any arguments.
  if (!args) {
    return {
      closureInfos: closureInfos,
      closureDependencies: closureDependencies,
      parameters: parameters,
    };
  }

  signature.parameters.forEach((paramSig, idx) => {
    const paramName = paramSig.name;
    const arg = args[idx];
    const param: ParameterInfo = { name: paramName, order: idx, expression: arg };

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
        console.warn("Found a parameter with more than one declarations: " + decls[0].getText());
      }

      // Generate the fn resource name
      let closureName = "";
      if (ts.isFunctionExpression(arg)) {
        closureName = arg.name?.getText() ?? "";
      }
      if (closureName == "") {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          arg.getSourceFile(),
          arg.getStart()
        );
        closureName = `fn_${line + 1}_${character + 1}`;
      }

      const result = visitFnResourceBody(arg, checker, closureName);
      if (result.resourceVarInfos) {
        closureInfos.push(...result.resourceVarInfos);
      }
      if (result.resourceRelatInfos) {
        closureDependencies.push(...result.resourceRelatInfos);
      }

      param.resourceName = closureName;
      parameters.push(param);
      return;
    }

    parameters.push(param);
    return;
  });

  return {
    closureInfos: closureInfos,
    closureDependencies: closureDependencies,
    parameters: parameters,
  };
}

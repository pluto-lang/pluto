import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { TypeCategory } from "pyright-internal/dist/analyzer/types";
import { CallNode, FunctionNode, ParseNodeType } from "pyright-internal/dist/parser/parseNodes";

export function getMemberName(node: CallNode, typeEvaluator: TypeEvaluator) {
  const type = typeEvaluator!.getType(node.leftExpression);
  if (!type || type.category !== TypeCategory.Function) {
    throw new Error("The left expression of the call must be a function.");
  }
  return type.details.name;
}

/**
 * Retrieves the function node associated with a call node.
 *
 * @param callNode - The call node.
 * @param typeEvaluator - The type evaluator.
 * @returns The function node associated with the call node.
 * @throws Error if the type of the call node is not supported, or if the __init__ function is not a
 * function.
 */
export function getFunctionDeclaration(
  callNode: CallNode,
  typeEvaluator: TypeEvaluator
): FunctionNode {
  let functionNode: FunctionNode;

  const type = typeEvaluator!.getType(callNode.leftExpression);
  switch (type?.category) {
    case TypeCategory.Class: {
      const constructor = type.details.fields.get("__init__")?.getDeclarations()[0].node;
      if (constructor?.nodeType !== ParseNodeType.Function) {
        throw new Error(`The __init__ function must be a function.`);
      }
      functionNode = constructor;
      break;
    }
    case TypeCategory.Function: {
      const func = type.details.declaration?.node;
      if (func?.nodeType !== ParseNodeType.Function) {
        throw new Error(`Only can get the parameter name from a function.`);
      }
      functionNode = func;
      break;
    }
    default:
      throw new Error(`The type of the call node is not supported.`);
  }

  return functionNode;
}

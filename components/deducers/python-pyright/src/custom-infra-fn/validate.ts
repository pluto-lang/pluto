import {
  CallNode,
  ParameterNode,
  ParseNode,
  ParseNodeType,
  ReturnNode,
  StatementListNode,
  SuiteNode,
} from "pyright-internal/dist/parser/parseNodes";
import { TypeCategory } from "pyright-internal/dist/analyzer/types";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import * as ScopeUtils from "../scope-utils";
import { SpecialNodeMap } from "../special-node-map";
import { Diagnostic, DiagnosticCategory } from "../diagnostic";
import { IRESOURCE_FULL_NAME } from "../type-consts";
import { CustomInfraFn } from "./custom-infra-fn-types";

/**
 * RULE: Ensure all custom infrastructure functions adhere to the following criteria:
 * 1. The node must be a function.
 * 2. The function must reside in the global scope.
 * 3. Parameter types must be defined and should not be 'function'.
 * 4. The content of the function must be limited to infrastructure-related calls (such as API
 *    interactions and the building of resources) and elementary manipulations of the arguments,
 *    like arithmetic operations. Defining functions within this function is prohibited.
 * 5. TODO: The function should return either None or a resource object.
 *
 * @param customInfraFn - The custom infrastructure function to validate.
 * @param typeEvaluator - The type evaluator to determine the type of the nodes.
 * @param specialNodeMap - The special node map to determine if a node is a special node.
 * @returns A list of diagnostics if the custom infrastructure function is invalid. Otherwise, an
 *  empty list.
 */
export function validateCustomInfraFn(
  customInfraFn: CustomInfraFn,
  typeEvaluator: TypeEvaluator,
  specialNodeMap: SpecialNodeMap<CallNode>
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const { topNode, hierarchy, sourceFile } = customInfraFn;
  if (topNode.nodeType !== ParseNodeType.Function) {
    // The node must be a function.
    diagnostics.push({
      source: sourceFile.getUri().getFilePath(),
      node: topNode,
      category: DiagnosticCategory.Error,
      message: `The node must be a function.`,
    });
    return diagnostics;
  }

  if (!ScopeUtils.inGlobalScope(hierarchy[0], sourceFile)) {
    // The function must reside in the global scope.
    diagnostics.push({
      source: sourceFile.getUri().getFilePath(),
      node: topNode,
      category: DiagnosticCategory.Error,
      message: `The function must reside in the global scope.`,
    });
    return diagnostics;
  }

  for (const param of topNode.parameters) {
    // Check the parameter type.
    validateParameter(param);
  }

  // Get all the statements in the function.
  const walker = new StatementWalker(topNode.suite);
  walker.walk(topNode.suite);
  if (walker._unsupportedNodes.length > 0) {
    // The function should only contain the infra calls (infra api and resource construction) and
    // function definitions.
    diagnostics.push({
      source: sourceFile.getUri().getFilePath(),
      node: topNode,
      category: DiagnosticCategory.Error,
      message: `The function should only contain statements that involve calling methods on resource objects, constructing resource objects, and defining functions.`,
    });
    return diagnostics;
  }

  const returnNodes: ReturnNode[] = [];
  for (const statement of walker._statementListNodes) {
    // The function should only contain the infra calls (infra api and resource construction) and
    // function definitions.
    statement.statements.forEach((node) => {
      if (node.nodeType === ParseNodeType.Return) {
        // We will check the return type in the next step.
        returnNodes.push(node);
        return;
      }

      // TODO: Allow the use of a resource object as the return value.
      // if (
      //   node.nodeType !== ParseNodeType.Call ||
      //   !specialNodeMap.getNodeById(node.id, IRESOURCE_INFRA_API_FULL_NAME)
      // ) {
      //   diagnostics.push({
      //     source: sourceFile.getUri().getFilePath(),
      //     node: node,
      //     category: DiagnosticCategory.Error,
      //     message: `The function should only contain statements that involve calling methods on resource objects, constructing resource objects, and defining functions.`,
      //   });
      // }
    });
  }
  if (returnNodes.length > 0) {
    diagnostics.push({
      source: sourceFile.getUri().getFilePath(),
      node: topNode,
      category: DiagnosticCategory.Error,
      message: `The function should not contain a return statement, currently.`,
    });
    return diagnostics;
  }

  // Check the return type.
  for (const returnStatmentNode of returnNodes) {
    if (returnStatmentNode.returnExpression === undefined) {
      // The function can return None.
      continue;
    }
    if (!specialNodeMap.getNodeById(returnStatmentNode.returnExpression.id, IRESOURCE_FULL_NAME)) {
      // The function should return either None or a resource object.
      diagnostics.push({
        source: sourceFile.getUri().getFilePath(),
        node: returnStatmentNode,
        category: DiagnosticCategory.Error,
        message: `The function should return either None or a resource object.`,
      });
    }
  }

  return diagnostics;

  function validateParameter(param: ParameterNode) {
    if (param.typeAnnotation === undefined) {
      // Parameter types must be defined.
      diagnostics.push({
        source: sourceFile.getUri().getFilePath(),
        node: param,
        category: DiagnosticCategory.Error,
        message: `The parameter type must be defined.`,
      });
      return;
    }

    if (param.typeAnnotation.nodeType !== ParseNodeType.Name) {
      // Parameter types should not be a complex type.
      console.log(param.typeAnnotation);
      diagnostics.push({
        source: sourceFile.getUri().getFilePath(),
        node: param,
        category: DiagnosticCategory.Error,
        message: `The parameter type must be a single type, should not be a complex type, like 'Callable[[], Any]'.`,
      });
      return;
    }

    const type = typeEvaluator.getType(param.typeAnnotation);
    if (type === undefined) {
      throw new Error(`Cannot determine the type of the parameter.`);
    }
    if (type.category === TypeCategory.Any) {
      // The parameter type should not be 'Any'.
      diagnostics.push({
        source: sourceFile.getUri().getFilePath(),
        node: param,
        category: DiagnosticCategory.Error,
        message: `The parameter type should not be 'Any'.`,
      });
      return;
    }

    if (type.category === TypeCategory.Function) {
      // The parameter type should not be 'Callable'.
      diagnostics.push({
        source: sourceFile.getUri().getFilePath(),
        node: param,
        category: DiagnosticCategory.Error,
        message: `The parameter type should not be 'Callable'.`,
      });
      return;
    }

    if (param.typeAnnotationComment !== undefined) {
      // The parameter type that defined in the comment will be ignored.
      diagnostics.push({
        source: sourceFile.getUri().getFilePath(),
        node: param,
        category: DiagnosticCategory.Warning,
        message: `The parameter type that defined in the comment will be ignored. Please use the type annotation.`,
      });
    }
  }
}

class StatementWalker extends ParseTreeWalker {
  public readonly _statementListNodes: StatementListNode[] = [];
  public readonly _unsupportedNodes: ParseNode[] = [];

  constructor(private readonly suitNode: SuiteNode) {
    super();
  }

  public get statementListNodes(): readonly StatementListNode[] {
    return this._statementListNodes;
  }

  public get unsupportedNodes(): readonly ParseNode[] {
    return this._unsupportedNodes;
  }

  public override visit(node: ParseNode): boolean {
    if (node === this.suitNode) {
      return true;
    }

    switch (node.nodeType) {
      case ParseNodeType.StatementList:
        this._statementListNodes.push(node);
        break;
      default:
        this._unsupportedNodes.push(node);
    }
    return false;
  }
}

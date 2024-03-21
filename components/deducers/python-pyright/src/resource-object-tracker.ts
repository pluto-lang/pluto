import assert from "node:assert";
import { TypeCategory } from "pyright-internal/dist/analyzer/types";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { DeclarationType } from "pyright-internal/dist/analyzer/declaration";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { CallNode, NameNode, ParseNodeType } from "pyright-internal/dist/parser/parseNodes";
import * as TextUtils from "./text-utils";
import * as TypeConsts from "./type-consts";
import { SpecialNodeMap } from "./special-node-map";

export class ResourceObjectTracker {
  private readonly cache = new Map<number, CallNode>();

  constructor(
    private readonly typeEvaluator: TypeEvaluator,
    private readonly sepcialNodeMap: SpecialNodeMap<CallNode>
  ) {}

  /**
   * Get the node that constructs the resource object the API call is on. The target node should be
   * within the special node map created by the TypeSearcher.
   * @param callNode - The node of the API calls, including the client API, the infrastructure API
   * and the captured property.
   * @param sourceFile - The source file that the API call is in.
   * @returns - The node of the resource object that the API call is on. If the node is not found,
   * return undefined.
   */
  public getConstructNodeForApiCall(callNode: CallNode, sourceFile: SourceFile) {
    if (this.cache.has(callNode.id)) {
      return this.cache.get(callNode.id);
    }

    const apiExpression = callNode.leftExpression;
    if (apiExpression.nodeType !== ParseNodeType.MemberAccess) {
      // This call expression isn't directly calling a method on a resource object, but might be
      // calling a function variable assigned to a method of a resource object. For example:
      // ```python
      // func = router.get
      // func("/path", handler)
      // ```
      const nodeText = TextUtils.getTextOfNode(callNode, sourceFile);
      throw new Error(
        `Failed to process this expression '${nodeText}'. We currently only support directly calling methods on the resource object; indirect method calls, such as assigning a method to a variable and then invoking it, are not supported.`
      );
    }

    let constructNode: CallNode | undefined;
    const callerNode = apiExpression.leftExpression;
    switch (callerNode.nodeType) {
      case ParseNodeType.Name:
        // The caller is a variable. We need to find the resource object that this variable is
        // assigned to, and get the node that constructs this resource object.
        constructNode = this.getConstructNodeByNameNode(callerNode, sourceFile);
        break;
      case ParseNodeType.Call:
        // The caller is a direct constructor call. We attempt to locate this node in the special
        // node map. If it's located, it means that the resource object being constructed by the
        // constructor call is the same as the one the API call is made on. If it's not found, an
        // error occurs, and this function's caller will address it.
        constructNode = this.getConstructNodeByCallNode(callerNode);
        break;
      default:
        throw new Error(`The caller node type '${callerNode.nodeType}' is not supported.`);
    }

    if (constructNode) {
      this.cache.set(callNode.id, constructNode);
    }
    return constructNode;
  }

  /**
   * The variable refers to a resource object. We're attempting to locate the calling node that
   * creates this resource object.
   * @param node - The name node refering to the resource object.
   * @param sourceFile - The source file that the node is in.
   * @returns - The node that constructs the resource object. If the node is not found, return
   * undefined.
   */
  public getConstructNodeByNameNode(node: NameNode, sourceFile: SourceFile): CallNode | undefined {
    if (this.cache.has(node.id)) {
      return this.cache.get(node.id);
    }

    const symbolTable = sourceFile.getModuleSymbolTable();
    if (!symbolTable) {
      throw new Error(`No symbol table found in source file '${sourceFile.getUri().key}'.`);
    }

    const symbol = symbolTable.get(node.value);
    if (!symbol) {
      throw new Error(`No symbol found for node '${node.value}'.`);
    }

    if (symbol.getDeclarations().length !== 1) {
      // If there are multiple declarations, we can't determine which one corresponds to the current
      // node.
      throw new Error(
        `Currently, we only support the resource variable only can be assigned once.`
      );
    }

    const declaration = symbol.getDeclarations()[0];
    if (declaration.type !== DeclarationType.Variable) {
      throw new Error(`The declaration type '${declaration.type}' is not variable.`);
    }

    // Since we know the node is in an infrastructure API call, the caller must be a resource
    // object, so we can trust that the inferred type source of this declaration must not be
    // undefined.
    assert(declaration.inferredTypeSource, "No inferred type source");
    const inferredTypeNode = declaration.inferredTypeSource!;

    // The `declaration.inferredTypeSource` is the source node that can be used to infer the type.
    // It should be either the function call or another resource object. In the latter case, the
    // current node is an alias variable of the other resource object.
    let constructNode: CallNode | undefined;
    switch (inferredTypeNode.nodeType) {
      case ParseNodeType.Call:
        // The inferred type source node is a direct constructor call. Search this node from the
        // special node map created by the TypeSearcher. If it's found, return it; otherwise, it is
        // an error, and the caller will handle it.
        constructNode = this.getConstructNodeByCallNode(inferredTypeNode);
        break;
      case ParseNodeType.Name:
        // The inferred type source node is another resource object.
        constructNode = this.getConstructNodeByNameNode(inferredTypeNode, sourceFile);
        break;
      default:
        throw new Error(
          `The inferred type source node type '${inferredTypeNode.nodeType}' is not supported.`
        );
    }

    if (constructNode) {
      this.cache.set(node.id, constructNode);
    }
    return constructNode;
  }

  private getConstructNodeByCallNode(callNode: CallNode): CallNode | undefined {
    if (this.cache.has(callNode.id)) {
      return this.cache.get(callNode.id);
    }

    const callType = this.typeEvaluator.getType(callNode.leftExpression);
    if (!callType || callType.category !== TypeCategory.Class) {
      throw new Error(
        `The type of the call node '${callType?.category}' is not a class.We currently only support the variable assigned from a class constructor.`
      );
    }
    const constructNode = this.sepcialNodeMap.getNodeById(
      callNode.id,
      TypeConsts.IRESOURCE_FULL_NAME
    );

    if (constructNode) {
      this.cache.set(callNode.id, constructNode);
    }
    return constructNode;
  }
}

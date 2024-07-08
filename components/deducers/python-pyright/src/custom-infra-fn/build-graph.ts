import assert from "assert";
import {
  CallNode,
  ExpressionNode,
  FunctionNode,
  LambdaNode,
  ModuleNode,
  NameNode,
  ParameterNode,
  ParseNodeType,
} from "pyright-internal/dist/parser/parseNodes";
import { TypeCategory } from "pyright-internal/dist/analyzer/types";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import * as TypeUtils from "../type-utils";
import * as TypeConsts from "../type-consts";
import { TypeSearcher } from "../type-searcher";
import { SpecialNodeMap } from "../special-node-map";
import { getNodeText } from "../common/position-utils";
import {
  Argument,
  Bundle,
  CapturedPropertyArgument,
  InternalCreatedResource,
  FunctionArgument,
  InfraRelationship,
  ParameterPassedResource,
  Relationship,
  Resource,
  ResourceArgument,
  ResourceGraph,
  TextArgument,
  ExternalCreatedResource,
} from "./graph-types";
import { ResourceObjectTracker } from "../resource-object-tracker";
import { getFunctionDeclaration } from "./utils";

const graphCache = new Map<number, ResourceGraph>();

/**
 * Builds a resource graph for a custom infrastructure function.
 *
 * @param typeEvaluator - The type evaluator used to evaluate types.
 * @param functionNode - The function node that represents the custom infrastructure function.
 * @returns The built graph.
 */
export function buildGraphForFunction(
  typeEvaluator: TypeEvaluator,
  tracker: ResourceObjectTracker,
  functionNode: FunctionNode
) {
  if (graphCache.has(functionNode.id)) {
    return graphCache.get(functionNode.id)!;
  }

  const graphBuilder = new GraphBuilder(typeEvaluator, tracker, functionNode);
  const graph = graphBuilder.buildGraph();

  graphCache.set(functionNode.id, graph);
  return graph;
}

export function buildGraphForModule(
  typeEvaluator: TypeEvaluator,
  tracker: ResourceObjectTracker,
  moduleNode: ModuleNode
) {
  if (graphCache.has(moduleNode.id)) {
    return graphCache.get(moduleNode.id)!;
  }

  const graphBuilder = new GraphBuilder(typeEvaluator, tracker, moduleNode);
  const graph = graphBuilder.buildGraph();

  graphCache.set(moduleNode.id, graph);
  return graph;
}

/**
 * This class is used to build a resource graph for a custom infrastructure function. When the
 * parameters of this function are given, it will provide part of the architecture reference.
 *
 * Note, this class cannot be reused for multiple custom infrastructure functions.
 */
class GraphBuilder {
  private specialNodeMap: SpecialNodeMap<CallNode>;

  private readonly buildedResoruces: Resource[] = [];
  private readonly buildedBundles: Bundle[] = [];
  private readonly buildedRelationships: Relationship[] = [];

  constructor(
    private readonly typeEvaluator: TypeEvaluator,
    private readonly tracker: ResourceObjectTracker,
    readonly functionNode: FunctionNode | ModuleNode
  ) {
    this.specialNodeMap = getSecpialNodes(this.typeEvaluator, this.functionNode);
  }

  public buildGraph(): ResourceGraph {
    this.specialNodeMap
      .getNodesByType(TypeConsts.IRESOURCE_FULL_NAME)
      ?.forEach((node) => this.findOrBuildResource(node));

    this.specialNodeMap
      .getNodesByType(TypeConsts.IRESOURCE_INFRA_API_FULL_NAME)
      ?.forEach((node) => this.buildInfraRelationship(node));

    const graph = ResourceGraph.create(
      this.buildedResoruces,
      this.buildedBundles,
      this.buildedRelationships
    );

    return graph;
  }

  /**
   * Finds an existing resource or builds a new one based on the provided node.
   *
   * @param node - The CallNode or ParameterNode to find or build the resource for.
   * @returns The found or built resource.
   */
  private findOrBuildResource(node: CallNode | ParameterNode) {
    let resource = this.buildedResoruces.find((resource) => resource.node.id === node.id);
    if (!resource) {
      resource = this.buildResource(node);
    }
    return resource;
  }

  private buildResource(node: CallNode | ParameterNode): Resource {
    const isCreatedInside = () => {
      return this.specialNodeMap.getNodeById(node.id) !== undefined;
    };

    if (node.nodeType === ParseNodeType.Call) {
      return isCreatedInside()
        ? this.buildInternalCreatedResource(node)
        : this.buildExternalCreatedResource(node);
    }
    return this.buildParameterPassedResource(node);
  }

  private buildExternalCreatedResource(callNode: CallNode) {
    const args = callNode.arguments.map((argNode) => this.createArgument(argNode.valueExpression));
    const resource = ExternalCreatedResource.create(callNode, args);
    this.buildedResoruces.push(resource);
    return resource;
  }

  private buildInternalCreatedResource(callNode: CallNode) {
    const args = this.createArgumentListForCallNode(callNode, /* isConstructorOrMember */ true);
    const resource = InternalCreatedResource.create(callNode, args);
    this.buildedResoruces.push(resource);
    return resource;
  }

  private buildParameterPassedResource(parameterNode: ParameterNode) {
    const resource = ParameterPassedResource.create(parameterNode);
    this.buildedResoruces.push(resource);
    return resource;
  }

  private buildInfraRelationship(infraApiCall: CallNode) {
    const resource = this.findResourceForCallee(infraApiCall);
    const operation = getMemberName(infraApiCall, this.typeEvaluator);
    const args = this.createArgumentListForCallNode(infraApiCall, /* isConstructorOrMember */ true);
    const relationship = InfraRelationship.create(infraApiCall, resource, operation, args);
    this.buildedRelationships.push(relationship);
  }

  private createArgumentListForCallNode(callNode: CallNode, isConstructorOrMember: boolean) {
    // We need to get all the arguments of the infrastructure api call, including the default
    // arguments.
    const args: Argument[] = [];
    // Loop through the arguments passed to the infrastructure API call.
    // This loop adds arguments until it encounters one with a name, indicating the start of named arguments.
    let argIdx = 0;
    for (; argIdx < callNode.arguments.length; argIdx++) {
      if (callNode.arguments[argIdx].name) {
        break;
      }
      const arg = this.createArgument(callNode.arguments[argIdx].valueExpression);
      args.push(arg);
    }

    // If the call is a constructor or member call, the first argument is the resource object itself.
    if (isConstructorOrMember) {
      argIdx++;
    }

    // Process the remaining arguments, which may be named or use default values.
    // This involves finding the corresponding function declaration to access parameter information.
    const functionNode = getFunctionDeclaration(callNode, this.typeEvaluator);
    for (; argIdx < functionNode.parameters.length; argIdx++) {
      const paramNode = functionNode.parameters[argIdx];
      // Find the corresponding argument node in the infrastructure API call. If it doesn't exist,
      // use the default value.
      const expressionNode =
        callNode.arguments.find((a) => a.name?.value === paramNode.name?.value)?.valueExpression ??
        functionNode.parameters[argIdx].defaultValue;
      args.push(this.createArgument(expressionNode));
    }
    return args;
  }

  private createArgument(argExp: ExpressionNode | undefined): Argument {
    const isFunction = () => {
      return (
        argExp &&
        (TypeUtils.isLambdaNode(argExp) || TypeUtils.isFunctionVar(argExp, this.typeEvaluator!))
      );
    };

    const isCapturedProperty = () => {
      return (
        argExp &&
        argExp.nodeType === ParseNodeType.Call &&
        this.specialNodeMap!.getNodeById(argExp.id, TypeConsts.IRESOURCE_CAPTURED_PROPS_FULL_NAME)
      );
    };

    const isResource = () => {
      const type = argExp ? this.typeEvaluator.getType(argExp) : undefined;
      return (
        type?.category === TypeCategory.Class &&
        TypeUtils.isSubclassOf(type, TypeConsts.IRESOURCE_FULL_NAME)
      );
    };

    // RULE: The captured property can only be accessed within the runtime functions or passed
    // as the argument of the infrastructure calls (including the constructor call and
    // infrastructure api).
    if (isCapturedProperty()) {
      assert(
        argExp && argExp.nodeType === ParseNodeType.Call,
        "The captured property must be a call node."
      );

      return this.createCapturedPropertyArgument(argExp);
    }

    if (isFunction()) {
      return this.createFunctionArgument(argExp as CallNode | NameNode | LambdaNode);
    }

    if (isResource()) {
      return this.createResourceArgument(argExp as CallNode | NameNode);
    }

    return TextArgument.create(argExp);
  }

  private createCapturedPropertyArgument(
    capturedPropertyCallNode: CallNode
  ): CapturedPropertyArgument {
    const resource = this.findResourceForCallee(capturedPropertyCallNode);
    const property = getMemberName(capturedPropertyCallNode, this.typeEvaluator);
    return CapturedPropertyArgument.create(resource as any, property);
  }

  private createFunctionArgument(argExp: CallNode | NameNode | LambdaNode): FunctionArgument {
    let bundleNode: CallNode | FunctionNode | LambdaNode | undefined;
    if (argExp.nodeType === ParseNodeType.Name) {
      // The argument is a function name, get the declaration node of the function.
      const valueNodeType = this.typeEvaluator.getType(argExp);
      assert(
        valueNodeType?.category === TypeCategory.Function,
        `${getNodeText(argExp)}: The argument must be a function.`
      );
      bundleNode = valueNodeType.details.declaration!.node;
    } else {
      bundleNode = argExp;
    }

    const bundle = Bundle.create(bundleNode);
    this.buildedBundles.push(bundle);
    return FunctionArgument.create(bundle);
  }

  private createResourceArgument(argExp: CallNode | NameNode): ResourceArgument {
    const resource = this.findResource(argExp);
    return ResourceArgument.create(resource!);
  }

  /**
   * Finds the resource object associated with the given name or function call node. If the node is
   * a name node, it will find the resource object declaration iteratively. If the node is a call
   * node, it represents it is a constructor call or a function call that creates the resource
   * object.
   * @param nameOrCallNode The name or function call node representing the resource object.
   * @returns The resource object associated with the given node.
   * @throws An error if the resource object declaration cannot be found or if there are multiple
   * declarations.
   */
  private findResource(nameOrCallNode: NameNode | CallNode) {
    // Try to find the resource object declaration.
    const declNode =
      nameOrCallNode.nodeType === ParseNodeType.Name
        ? this.tracker.getDeclarationForNameNode(nameOrCallNode)
        : this.tracker.getDeclarationForCallerOfCallNode(nameOrCallNode);

    if (!declNode) {
      throw new Error(
        `${getNodeText(nameOrCallNode)}: Cannot find the resource object declaration.`
      );
    }

    const resource = this.findOrBuildResource(declNode);
    return resource;
  }

  /**
   * Finds the resource for the callee of a call node.
   * @param callNode - The call node.
   * @returns The resource for the callee.
   * @throws An error if the member of the resource object is not accessed directly.
   */
  private findResourceForCallee(callNode: CallNode) {
    const exp = callNode.leftExpression;
    if (exp.nodeType !== ParseNodeType.MemberAccess) {
      // RULE: The captured property must be accessed by the member, cannot be accessed by the
      // renamed variable.
      // RULE: The members of a resource object must be invoked directly, they cannot be called through a variable that has been assigned by a member of the resource object.
      throw new Error(
        `${getNodeText(exp)}: The member of the resource object must be accessed directly.`
      );
    }

    const resourceCallee = exp.leftExpression;
    if (
      resourceCallee.nodeType !== ParseNodeType.Name &&
      resourceCallee.nodeType !== ParseNodeType.Call
    ) {
      // RULE: The captured property must be accessed by the member of the resource object.
      throw new Error(
        `${getNodeText(
          resourceCallee
        )}: The member of the resource object must be accessed directly.`
      );
    }

    return this.findResource(resourceCallee);
  }
}

function getSecpialNodes(typeEvaluator: TypeEvaluator, node: FunctionNode | ModuleNode) {
  const walker = new TypeSearcher(typeEvaluator, /* skipSubScope */ true);
  walker.walk(node.nodeType === ParseNodeType.Function ? node.suite : node);
  return walker.specialNodeMap;
}

function getMemberName(node: CallNode, typeEvaluator: TypeEvaluator) {
  const type = typeEvaluator!.getType(node.leftExpression);
  if (!type || type.category !== TypeCategory.Function) {
    throw new Error("The left expression of the call must be a function.");
  }
  return type.details.name;
}

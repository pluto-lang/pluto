import assert from "assert";
import * as path from "path";
import * as fs from "fs-extra";
import { arch } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { DeclarationType } from "pyright-internal/dist/analyzer/declaration";
import { ClassType, TypeCategory } from "pyright-internal/dist/analyzer/types";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { ArgumentNode, CallNode, ParseNodeType } from "pyright-internal/dist/parser/parseNodes";
import { ValueEvaluator } from "../value-evaluator/value-evaluator";
import { Value, ValueType, genEnvVarAccessTextForTypeScript } from "../value-evaluator";
import {
  Argument,
  ArgumentType,
  Bundle,
  CapturedPropRelationship,
  CapturedPropertyArgument,
  ClientRelationship,
  ExternalCreatedResource,
  FunctionArgument,
  InfraRelationship,
  InternalCreatedResource,
  ParameterPassedResource,
  Relationship,
  RelationshipType,
  Resource,
  ResourceArgument,
  ResourceGraph,
  ResourceType,
  TextArgument,
} from "./graph-types";
import { CodeExtractor, CodeSegment } from "../code-extractor";
import { ResourceObjectTracker } from "../resource-object-tracker";
import { getFunctionDeclaration, getMemberName } from "./utils";

type ParseNodeId = number;

export interface EvaluateResult {
  readonly archRef: arch.Architecture;
  readonly resourceMapping: ReadonlyMap<ParseNodeId, arch.Resource>;
}

export interface EvaluateGraphOptions {
  readonly resourceFillings?: ReadonlyMap<ParseNodeId, arch.Resource>;
  readonly argumentFillings?: ReadonlyMap<ParseNodeId, ArgumentNode>;

  readonly bundleFilename?: string;
  readonly exportName?: string;
  readonly bundleIdSuffix?: string;
}

export function evaluateGraph(
  graph: ResourceGraph,
  projectInfo: ProjectInfo,
  sourceFile: SourceFile,
  typeEvaluator: TypeEvaluator,
  valueEvaluator: ValueEvaluator,
  codeExtractor: CodeExtractor,
  resourceObjectTracker: ResourceObjectTracker,
  options: EvaluateGraphOptions = {}
): EvaluateResult {
  const evaluator = new GraphEvaluator(
    projectInfo,
    typeEvaluator,
    valueEvaluator,
    codeExtractor,
    resourceObjectTracker,
    sourceFile,
    graph,
    options.resourceFillings ?? new Map(),
    options.argumentFillings ?? new Map(),
    options.bundleFilename ?? "__init__.py",
    options.exportName ?? "_default",
    options.bundleIdSuffix
  );
  return evaluator.evaluate();
}

export interface ProjectInfo {
  readonly projectName: string;
  readonly stackName: string;
  readonly bundleBaseDir: string;
}

class GraphEvaluator {
  private readonly resourceMapping: Map<ParseNodeId, arch.Resource> = new Map();
  private readonly bundleMapping: Map<ParseNodeId, arch.Closure> = new Map();

  private readonly notInfraRelationships: arch.Relationship[] = [];

  constructor(
    private readonly projectInfo: ProjectInfo,
    private readonly typeEvaluator: TypeEvaluator,
    private readonly valueEvaluator: ValueEvaluator,
    private readonly codeExtractor: CodeExtractor,
    private readonly tracker: ResourceObjectTracker,
    private readonly sourceFile: SourceFile,
    private readonly graph: ResourceGraph,
    private readonly resourceFillings: ReadonlyMap<ParseNodeId, arch.Resource>,
    private readonly argumentFillings: ReadonlyMap<ParseNodeId, ArgumentNode>,
    private readonly bundleFilename: string,
    private readonly exportName: string,
    private readonly bundleIdSuffix?: string
  ) {}

  public evaluate() {
    const archRef = new arch.Architecture();

    this.graph.resources.forEach((resource) => {
      const res = this.evaluateResource(resource);
      archRef.addResource(res);
      this.resourceMapping.set(resource.node.id, res);
    });

    this.graph.relationships.forEach((relationship, idx) => {
      const relat = this.evaluateRelationship(relationship, idx);
      archRef.addRelationship(relat);
    });

    this.bundleMapping.forEach((bundle) => archRef.addClosure(bundle));
    this.notInfraRelationships.forEach((relat) => archRef.addRelationship(relat));

    return {
      archRef,
      resourceMapping: this.resourceMapping,
    };
  }

  private evaluateResource(resource: Resource) {
    switch (resource.type) {
      case ResourceType.ExternalCreated:
        return this.evaluateExternalCreatedResource(resource);

      case ResourceType.ParameterPassed:
        return this.evaluateParameterPassedResource(resource);

      case ResourceType.InternalCreated:
        return this.evaluateInternalCreatedResource(resource);
    }
  }

  private evaluateInternalCreatedResource(resource: InternalCreatedResource) {
    const getResourceName = () => {
      for (let idx = 0; idx < resource.arguments.length; idx++) {
        const arg = resource.arguments[idx];
        const paramName =
          getParameterName(
            resource.node,
            idx,
            this.typeEvaluator,
            /* isConstructorOrClassMethod */ true
          ) ?? "unknown";

        if (paramName === "name") {
          assert(arg.type === ArgumentType.Text, `Resource name must be a text`);
          if (arg.node) {
            const argValue = this.valueEvaluator.evaluate(arg.node, this.argumentFillings);
            const stringified = Value.toJson(argValue, {
              genEnvVarAccessText: genEnvVarAccessTextForTypeScript,
            });
            return JSON.parse(stringified);
          }
        }
      }
      return;
    };

    const resourceName = getResourceName() ?? "default";
    const resourceFqn = this.getFqnForConstructor(resource.node);
    const resourceId = genResourceId(
      this.projectInfo.projectName,
      this.projectInfo.stackName,
      resourceFqn,
      resourceName
    );

    const args: arch.Argument[] = resource.arguments.map((arg, idx) => {
      const paramName =
        getParameterName(
          resource.node,
          idx,
          this.typeEvaluator,
          /* isConstructorOrClassMethod */ true
        ) ?? "unknown";

      // Generate a unique bundle ID for the argument. This bundle is included in the
      // resource's constructor. The ID is formatted as `<resourceId>_constructor_<argIndex>`.
      const bundleId = `${resourceId}_constructor_${idx}`;
      return this.evaluateArgument(arg, paramName, idx, bundleId);
    });

    const r = arch.Resource.create(resourceId, resourceName, resourceFqn, args);
    return r;
  }

  private evaluateExternalCreatedResource(resource: ExternalCreatedResource) {
    const res = this.resourceFillings.get(resource.node.id);
    if (!res) {
      throw new Error(`Resource ${resource.toString()} not found in fillings`);
    }
    return res;
  }

  private evaluateParameterPassedResource(resource: ParameterPassedResource) {
    const argNode = this.argumentFillings.get(resource.node.id);
    if (!argNode) {
      throw new Error(`Resource ${resource.toString()} not found in fillings`);
    }

    if (argNode.valueExpression.nodeType === ParseNodeType.Name) {
      const declNode = this.tracker.getDeclarationForNameNode(argNode.valueExpression);
      if (!declNode) {
        throw new Error(`The declaration node for ${resource.toString()} not found`);
      }

      if (declNode.nodeType !== ParseNodeType.Call) {
        throw new Error(`The declaration node for ${resource.toString()} is not a call node`);
      }
      const res = this.resourceFillings.get(declNode.id);
      if (!res) {
        throw new Error(`The resource associated with ${resource.toString()} not found`);
      }
      return res;
    } else if (argNode.valueExpression.nodeType === ParseNodeType.Call) {
      // This have to be a resource creation call.
      const res = this.resourceFillings.get(argNode.valueExpression.id);
      if (!res) {
        throw new Error(`The resource associated with ${resource.toString()} not found`);
      }
      return res;
    } else {
      throw new Error(`The value expression of ${resource.toString()} is not supported`);
    }
  }

  private evaluateBundle(bundle: Bundle, bundleId: string): arch.Closure {
    const codeSegment = this.codeExtractor.extractExpressionRecursively(
      bundle.node.nodeType === ParseNodeType.Function ? bundle.node.name : bundle.node,
      this.sourceFile,
      this.argumentFillings
    );

    if (this.bundleIdSuffix) {
      bundleId = `${bundleId}_${this.bundleIdSuffix}`;
    }

    const bundleText = CodeSegment.toString(codeSegment, this.exportName);
    const bundleFile = path.resolve(this.projectInfo.bundleBaseDir, bundleId, this.bundleFilename);
    fs.ensureFileSync(bundleFile);
    fs.writeFileSync(bundleFile, bundleText);

    const accessedEnvVars = CodeSegment.getAccessedEnvVars(codeSegment);
    const archBundle = new arch.Closure(bundleId, path.dirname(bundleFile), accessedEnvVars);

    // Get the client's API calls and establish the connection between the closure and the
    // resource object associated with the caller.
    CodeSegment.getCalledClientApis(codeSegment).forEach((clientApi) => {
      const constructNode = this.tracker!.getDeclarationForCallerOfCallNode(clientApi);
      if (!constructNode) {
        throw new Error("No resource object found for the client API call.");
      }

      const resource =
        this.resourceMapping.get(constructNode.id) ?? this.resourceFillings.get(constructNode.id);
      if (!resource) {
        throw new Error(`Resource ${constructNode.toString()} not found`);
      }

      const operation = getMemberName(clientApi, this.typeEvaluator);
      const relationship = arch.ClientRelationship.create(archBundle, resource, operation);
      this.notInfraRelationships.push(relationship);
    });

    // Get the accessed captured properties and establish the connection between the closure and
    // the resource object associated with the accessed captured properties.
    CodeSegment.getAccessedCapturedProperties(codeSegment).forEach((accessedProp) => {
      const constructNode = this.tracker!.getDeclarationForCallerOfCallNode(accessedProp);
      if (!constructNode) {
        throw new Error("No resource object found for the client API call.");
      }

      const resource =
        this.resourceMapping.get(constructNode.id) ?? this.resourceFillings.get(constructNode.id);
      if (!resource) {
        throw new Error(`Resource ${constructNode.toString()} not found`);
      }

      const property = getMemberName(accessedProp, this.typeEvaluator!);
      const relationship = arch.CapturedPropertyRelationship.create(archBundle, resource, property);
      this.notInfraRelationships.push(relationship);
    });

    return archBundle;
  }

  private evaluateRelationship(relationship: Relationship, relatIdx: number): arch.Relationship {
    switch (relationship.type) {
      case RelationshipType.Infrastructure:
        return this.evaluateInfraRelationship(relationship, relatIdx);
      case RelationshipType.Client:
        return this.evaluateClientRelationship(relationship);
      case RelationshipType.CapturedProperty:
        return this.evaluateCapturedPropertyRelationship(relationship);
    }
  }

  private evaluateInfraRelationship(
    relationship: InfraRelationship,
    relatIdx: number
  ): arch.Relationship {
    const callerResource = this.resourceMapping.get(relationship.caller.node.id);

    if (!callerResource) {
      throw new Error(`Caller resource ${relationship.caller.toString()} not found`);
    }

    const args = relationship.arguments.map((arg, idx) => {
      const paramName =
        getParameterName(
          relationship.node,
          idx,
          this.typeEvaluator,
          /* isConstructorOrClassMethod */ true
        ) ?? "unknown";

      // Generate a unique bundle ID for the argument. This bundle is included in the
      // relationship's operation. The ID is formatted as
      // `<callerId>_<operation>_<relationshipIndex>_<argIndex>`.
      const bundleId = `${callerResource.id}_${relatIdx}_${relationship.operation}_${idx}`;
      return this.evaluateArgument(arg, paramName, idx, bundleId);
    });

    return arch.InfraRelationship.create(callerResource, relationship.operation, args);
  }

  private evaluateClientRelationship(relationship: ClientRelationship): arch.Relationship {
    const bundle = this.bundleMapping.get(relationship.bundle.node.id);
    const resource = this.resourceMapping.get(relationship.resource.node.id);

    if (!bundle) {
      throw new Error(`Bundle ${relationship.bundle.toString()} not found`);
    }

    if (!resource) {
      throw new Error(`Resource ${relationship.resource.toString()} not found`);
    }

    return arch.ClientRelationship.create(bundle, resource, relationship.operation);
  }

  private evaluateCapturedPropertyRelationship(
    relationship: CapturedPropRelationship
  ): arch.Relationship {
    const bundle = this.bundleMapping.get(relationship.bundle.node.id);
    const callerResource = this.resourceMapping.get(relationship.resource.node.id);

    if (!bundle) {
      throw new Error(`Bundle ${relationship.bundle.toString()} not found`);
    }

    if (!callerResource) {
      throw new Error(`Caller resource ${relationship.resource.toString()} not found`);
    }

    return arch.CapturedPropertyRelationship.create(bundle, callerResource, relationship.property);
  }

  private evaluateArgument(
    argument: Argument,
    paramName: string,
    paramIndex: number,
    preparedBundleId: string
  ) {
    switch (argument.type) {
      case ArgumentType.Text:
        return this.evaluateTextArgument(argument, paramName, paramIndex);

      case ArgumentType.Resource:
        return this.evaluateResourceArgument(argument, paramName, paramIndex);

      case ArgumentType.CapturedProperty:
        return this.evaluateCapturedPropertyArgument(argument, paramName, paramIndex);

      case ArgumentType.Bundle:
        return this.evaluateFunctionArgument(argument, paramName, paramIndex, preparedBundleId);
    }
  }

  private evaluateTextArgument(argument: TextArgument, paramName: string, paramIndex: number) {
    let content = "undefined";
    if (argument.node) {
      const argValue = this.valueEvaluator.evaluate(argument.node, this.argumentFillings);
      if (argValue.valueType !== ValueType.None) {
        // The generator will use the constructed argument to generate the infrastructure code,
        // which is in TypeScript. Therefore, we need to generate the environment variable access
        // text in TypeScript format.
        content = Value.toJson(argValue, {
          genEnvVarAccessText: genEnvVarAccessTextForTypeScript,
        });
      }
    }

    const parameter = arch.TextArgument.create(paramIndex, paramName, content);
    return parameter;
  }

  private evaluateResourceArgument(
    argument: ResourceArgument,
    paramName: string,
    paramIndex: number
  ) {
    const targetId = argument.resource.node.id;
    const r = this.resourceMapping.get(targetId);

    if (!r) {
      throw new Error(`The resource associated with argument ${argument.toString()} not found`);
    }

    const parameter = arch.ResourceArgument.create(paramIndex, paramName, r.id);
    return parameter;
  }

  private evaluateCapturedPropertyArgument(
    argument: CapturedPropertyArgument,
    paramName: string,
    paramIndex: number
  ) {
    const targetId = argument.resource.node.id;
    const r = this.resourceMapping.get(targetId);

    if (!r) {
      throw new Error(`The resource associated with argument ${argument.toString()} not found`);
    }

    const parameter = arch.CapturedPropertyArgument.create(
      paramIndex,
      paramName,
      r.id,
      argument.property
    );
    return parameter;
  }

  private evaluateFunctionArgument(
    argument: FunctionArgument,
    paramName: string,
    paramIndex: number,
    preparedBundleId: string
  ) {
    let bundle = this.bundleMapping.get(argument.bundle.node.id);
    if (!bundle) {
      bundle = this.evaluateBundle(argument.bundle, preparedBundleId);
      this.bundleMapping.set(argument.bundle.node.id, bundle);
    }

    const parameter = arch.ClosureArgument.create(paramIndex, paramName, bundle.id);
    return parameter;
  }

  private getFqnForConstructor(callNode: CallNode) {
    // Get the full qualified name of the class type.
    const classType = this.typeEvaluator.getType(callNode);
    if (!classType || classType.category !== TypeCategory.Class) {
      throw new Error("The constructor node must be a class type.");
    }
    const typeFqn = getFqnOfResourceType(classType, this.valueEvaluator);
    return typeFqn;
  }
}

/**
 * Get the name of the parameter at index `idx` for the function associated with this call node.
 * @param callNode - The call node.
 * @param idx - The expected parameter's index.
 * @returns The name of the parameter if it exists; otherwise, undefined.
 */
function getParameterName(
  callNode: CallNode,
  idx: number,
  typeEvaluator: TypeEvaluator,
  isConstructorOrClassMethod = false
): string | undefined {
  const functionNode = getFunctionDeclaration(callNode, typeEvaluator);
  const parameters = functionNode.parameters;
  const realIdx = idx + (isConstructorOrClassMethod ? 1 : 0);
  if (realIdx < parameters.length) {
    return parameters[realIdx].name?.value;
  }
  return;
}

function getFqnOfResourceType(type: ClassType, valueEvaluator: ValueEvaluator): string {
  const fqnMember = type.details.fields.get("fqn");
  if (fqnMember === undefined) {
    throw new Error(`The resource type ${type.details.name} does not have a 'fqn' field.`);
  }

  if (fqnMember.getDeclarations().length !== 1) {
    throw new Error(
      `The 'fqn' field of the resource type ${type.details.name} must be assigned only once.`
    );
  }

  const decl = fqnMember.getDeclarations()[0];
  if (decl.type !== DeclarationType.Variable) {
    throw new Error(
      `The 'fqn' field of the resource type ${type.details.name} must be a variable.`
    );
  }

  const assignmentNode = decl.node.parent;
  if (!assignmentNode || assignmentNode.nodeType !== ParseNodeType.Assignment) {
    throw new Error(
      `The 'fqn' field of the resource type ${type.details.name} must be a variable assignment.`
    );
  }

  const value = valueEvaluator.evaluate(assignmentNode.rightExpression);
  const stringifiedFqn = Value.toString(value);
  return JSON.parse(stringifiedFqn);
}

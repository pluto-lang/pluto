import { Writable } from "stream";
import {
  CallNode,
  ExpressionNode,
  FunctionNode,
  LambdaNode,
  ParameterNode,
} from "pyright-internal/dist/parser/parseNodes";
import { getNodeText } from "../value-evaluator/utils";

interface EntityBase {
  toString(): string;
}

export interface ResourceGraph {
  readonly resources: Resource[];
  readonly bundles: Bundle[];
  readonly relationships: Relationship[];
}

export namespace ResourceGraph {
  export function create(
    resources: Resource[],
    bundles: Bundle[],
    relationships: Relationship[]
  ): ResourceGraph {
    const graph: ResourceGraph = {
      resources,
      bundles,
      relationships,
    };

    return graph;
  }

  export function merge(graph1: ResourceGraph, graph2: ResourceGraph): ResourceGraph {
    const resources = graph1.resources.concat(graph2.resources);
    const bundles = graph1.bundles.concat(graph2.bundles);
    const relationships = graph1.relationships.concat(graph2.relationships);

    return create(resources, bundles, relationships);
  }

  export function print(graph: ResourceGraph, log: Writable = process.stdout) {
    log.write("Resources:\n");
    graph.resources.forEach((resource) => {
      if (resource.type === ResourceType.InternalCreated) {
        log.write(`    ${resource.toString()}\n`);
      } else {
        log.write(`    ${resource.toString()}\n`);
      }
    });

    log.write("Bundles:\n");
    graph.bundles.forEach((bundle) => {
      log.write(`    ${bundle.toString()}\n`);
    });

    log.write("Relationships:\n");
    graph.relationships.forEach((relationship) => {
      log.write(`    ${relationship.toString()}\n`);
    });
  }
}

export enum ResourceType {
  /**
   * A resource that is created within the current scope.
   */
  InternalCreated = "internalCreated",
  /**
   * A resource that is created in an external scope.
   */
  ExternalCreated = "externalCreated",
  /**
   * A resource that is passed as a parameter.
   */
  ParameterPassed = "parameterPassed",
}

export interface InternalCreatedResource extends EntityBase {
  readonly type: ResourceType.InternalCreated;
  readonly node: CallNode;
  readonly arguments: Argument[];
}

export namespace InternalCreatedResource {
  export function create(constructorCallNode: CallNode, args: Argument[]): InternalCreatedResource {
    const resource: InternalCreatedResource = {
      type: ResourceType.InternalCreated,
      node: constructorCallNode,
      arguments: args,
      toString: () => {
        let content = `Resource#InternalCreated(${getNodeText(constructorCallNode)}`;
        if (args.length > 0) {
          content += `, [${args.map((arg) => arg.toString()).join(", ")}]`;
        }
        content += ")";
        return content;
      },
    };

    return resource;
  }
}

export interface ExternalCreatedResource extends EntityBase {
  readonly type: ResourceType.ExternalCreated;
  readonly node: CallNode;
  readonly arguments: Argument[];
}

export namespace ExternalCreatedResource {
  export function create(constructorCallNode: CallNode, args: Argument[]): ExternalCreatedResource {
    const resource: ExternalCreatedResource = {
      type: ResourceType.ExternalCreated,
      node: constructorCallNode,
      arguments: args,
      toString: () => {
        let content = `Resource#ExternalCreated(${getNodeText(constructorCallNode)}`;
        if (args.length > 0) {
          content += `, [${args.map((arg) => arg.toString()).join(", ")}]`;
        }
        content += ")";
        return content;
      },
    };

    return resource;
  }
}

export interface ParameterPassedResource extends EntityBase {
  readonly type: ResourceType.ParameterPassed;
  readonly node: ParameterNode;
}

export namespace ParameterPassedResource {
  export function create(parameterNode: ParameterNode): ParameterPassedResource {
    const resource: ParameterPassedResource = {
      type: ResourceType.ParameterPassed,
      node: parameterNode,
      toString: () => `Resource#ParameterPassed${getNodeText(parameterNode)}`,
    };

    return resource;
  }
}

export type Resource = InternalCreatedResource | ExternalCreatedResource | ParameterPassedResource;

export interface Bundle extends EntityBase {
  /**
   * The node is the entry point of the code block that will be executed at runtime. If the node is
   * a CallNode, it needs to be a function call that returns a function closure.
   */
  readonly node: CallNode | FunctionNode | LambdaNode;
}

export namespace Bundle {
  export function create(node: CallNode | FunctionNode | LambdaNode): Bundle {
    const bundle: Bundle = {
      node,
      toString: () => `Bundle(${getNodeText(node)})`,
    };

    return bundle;
  }
}

export enum RelationshipType {
  Infrastructure = "infrastructure",
  Client = "client",
  CapturedProperty = "capturedProperty",
}

export interface InfraRelationship extends EntityBase {
  readonly type: RelationshipType.Infrastructure;
  readonly node: CallNode;
  readonly caller: Resource;
  readonly operation: string;
  readonly arguments: Argument[];
}

export namespace InfraRelationship {
  export function create(
    node: CallNode,
    caller: Resource,
    operation: string,
    args: Argument[]
  ): InfraRelationship {
    const relationship: InfraRelationship = {
      type: RelationshipType.Infrastructure,
      node,
      caller,
      operation,
      arguments: args,
      toString: () => {
        let content = `Relationship#Infrastructure(${caller.toString()}, ${operation}`;
        if (args.length > 0) {
          content += `, [${args.map((arg) => arg.toString()).join(", ")}]`;
        }
        content += ")";
        return content;
      },
    };

    return relationship;
  }
}

export interface ClientRelationship {
  readonly type: RelationshipType.Client;
  readonly bundle: Bundle;
  readonly resource: Resource;
  readonly operation: string;
}

export namespace ClientRelationship {
  export function create(
    bundle: Bundle,
    resource: Resource,
    operation: string
  ): ClientRelationship {
    const relationship: ClientRelationship = {
      type: RelationshipType.Client,
      bundle,
      resource,
      operation,
    };

    return relationship;
  }
}

export interface CapturedPropRelationship {
  readonly type: RelationshipType.CapturedProperty;
  readonly bundle: Bundle;
  readonly resource: Resource;
  readonly property: string;
}

export namespace CapturedPropRelationship {
  export function create(
    bundle: Bundle,
    resource: Resource,
    property: string
  ): CapturedPropRelationship {
    const relationship: CapturedPropRelationship = {
      type: RelationshipType.CapturedProperty,
      bundle,
      resource,
      property,
    };

    return relationship;
  }
}

export type Relationship = InfraRelationship | ClientRelationship | CapturedPropRelationship;

export enum ArgumentType {
  Text = "text",
  Resource = "resource",
  CapturedProperty = "capturedProperty",
  Bundle = "bundle",
}

export interface TextArgument extends EntityBase {
  readonly type: ArgumentType.Text;
  readonly node: ExpressionNode | undefined;
}

export namespace TextArgument {
  export function create(node: ExpressionNode | undefined): TextArgument {
    const argument: TextArgument = {
      type: ArgumentType.Text,
      node,
      toString: () => (node ? `Argument#Text(${getNodeText(node)})` : `Argument#Text(undefined)`),
    };

    return argument;
  }
}

export interface ResourceArgument extends EntityBase {
  readonly type: ArgumentType.Resource;
  readonly resource: Resource;
}

export namespace ResourceArgument {
  export function create(resource: Resource): ResourceArgument {
    const argument: ResourceArgument = {
      type: ArgumentType.Resource,
      resource,
      toString: () => `Argument#Resource(${resource.toString()})`,
    };

    return argument;
  }
}

export interface CapturedPropertyArgument extends EntityBase {
  readonly type: ArgumentType.CapturedProperty;
  readonly resource: Resource;
  readonly property: string;
}

export namespace CapturedPropertyArgument {
  export function create(resource: Resource, property: string): CapturedPropertyArgument {
    const argument: CapturedPropertyArgument = {
      type: ArgumentType.CapturedProperty,
      resource,
      property,
      toString: () => `Argument#CapturedProperty(${resource.toString()}, ${property})`,
    };

    return argument;
  }
}

export interface FunctionArgument extends EntityBase {
  readonly type: ArgumentType.Bundle;
  readonly bundle: Bundle;
}

export namespace FunctionArgument {
  export function create(bundle: Bundle): FunctionArgument {
    const argument: FunctionArgument = {
      type: ArgumentType.Bundle,
      bundle,
      toString: () => `Argument#Bundle(${bundle.toString()})`,
    };

    return argument;
  }
}

export type Argument =
  | TextArgument
  | ResourceArgument
  | CapturedPropertyArgument
  | FunctionArgument;

import { createHash } from "crypto";
import { Resource } from "./resource";
import { BundleArgument } from "./argument";
import { Architecture } from "./architecture";
import { BundleEntity, Entity, EntityType, RelationshipEntity, ResourceEntity } from "./types";
import {
  ClientRelationship,
  CapturedPropertyRelationship,
  InfraRelationship,
  RelationshipType,
} from "./relationship";

type EntityMap = Record<string, Entity>;
function genNodeIndex(node: Entity): string {
  const hash = createHash("md5").update(JSON.stringify(node)).digest("hex").substring(0, 8);
  if (node.type === EntityType.Resource) {
    return `resource_${hash}`;
  } else if (node.type === EntityType.Bundle) {
    return `closure_${hash}`;
  } else {
    return `relationship_${hash}`;
  }
}

type Graph = Record<string, string[]>;

/** @internal */
export class TopoSorter {
  private readonly archRef: Architecture;

  private nodeMap: EntityMap = {};
  private graph: Graph = {};

  constructor(archRef: Architecture) {
    this.archRef = archRef;
    this.initGraph();
  }

  public topologySort(): Entity[] {
    // Calculate the in-degree of each node.
    const inDegree = new Map<string, number>();
    for (const node of Object.keys(this.nodeMap)) {
      if (!inDegree.has(node)) {
        inDegree.set(node, 0);
      }

      if (!(node in this.graph)) {
        continue;
      }
      for (const neighbor of this.graph[node]) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }

    // Add nodes with an in-degree of 0 to the queue.
    const queue = new Set(Object.keys(this.nodeMap).filter((node) => inDegree.get(node) === 0));

    // Sequentially remove nodes from the queue, and decrement the in-degree of their neighboring nodes by 1.
    // If the in-degree of a neighboring node drops to 0, it is added to the queue.
    const result: string[] = [];
    while (queue.size > 0) {
      const node = [...queue.values()][0];
      queue.delete(node);
      result.push(node);
      if (!(node in this.graph)) {
        continue;
      }
      for (const neighbor of this.graph[node]) {
        const neighborInDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, neighborInDegree);
        if (neighborInDegree === 0) {
          queue.add(neighbor);
        }
      }
    }

    // If a cycle exists, topological sorting cannot be performed and will return `undefined`.
    if (result.length !== Object.keys(this.nodeMap).length) {
      throw new Error(`There is a cycle in the graph.`);
    }

    const nodes = result.map((nodeIdx) => this.nodeMap[nodeIdx]);
    return nodes;
  }

  private initGraph() {
    // Retrieve all nodes, encompassing the resources, closures, and 'Create' type relationships. Each of these will correspond to a statement in the generated infrastructure code.
    this.nodeMap = this.buildNodeMap();
    // Build the edges to construct the graph. There are four types of dependencies:
    //   1. Constructor: A resource depends on its parameters.
    this.addEdgesOfConstructor();
    //   2. Create: The 'Create' relationship node depends on both the 'from' and 'to' properties.
    this.addEdgesOfRelationship_Create();
    //   3. Method call: The 'to' property depends on the 'from' property.
    //   4. Property access: The 'to' property depends on the 'from' property.
    this.addEdgesOfRelationship_MethodCallAndPropertyAccess();
  }

  private buildNodeMap() {
    const nodes: Entity[] = [
      ...this.archRef.resources.map((r) => ResourceEntity.create(r)),
      ...this.archRef.closures.map((c) => BundleEntity.create(c)),
      ...this.archRef.relationships
        .filter((relat) => relat.type === RelationshipType.Infrastructure)
        .map((r) => RelationshipEntity.create(r)),
    ];

    const nodeMap: EntityMap = {};
    nodes.forEach((resource) => {
      const nodeIdx = genNodeIndex(resource);
      if (nodeIdx in nodeMap) {
        throw new Error(`Duplicate id: ${nodeIdx}`);
      }
      nodeMap[nodeIdx] = resource;
    });
    return nodeMap;
  }

  // Constructor: A resource depends on its parameters.
  // Thus, the edge originates from the parameter nodes and points towards the resource node.
  private addEdgesOfConstructor() {
    this.archRef.resources.forEach((resource) => {
      const targetNode = resource;
      resource.arguments
        .filter<BundleArgument>((arg): arg is BundleArgument => arg.type === "closure")
        .forEach((arg) => {
          const sourceNode = this.archRef.findClosure(arg.closureId);
          if (sourceNode == undefined) {
            throw Error(
              `The architecture is invalid, the closure '${arg.closureId}' cannot be found.`
            );
          }
          this.addOneEdge(BundleEntity.create(sourceNode), ResourceEntity.create(targetNode));
        });
    });
  }

  // Create: The 'Create' relationship node depends on both the 'from' and 'to' properties.
  // Thus, the edge originates from 'from' and 'to' and points towards the relationship node.
  private addEdgesOfRelationship_Create() {
    this.archRef.relationships
      .filter<InfraRelationship>(
        (relat): relat is InfraRelationship => relat.type === RelationshipType.Infrastructure
      )
      .forEach((relat) => {
        const targetNode = relat;
        const sourceNode = this.archRef.findResource(relat.caller.id);
        if (sourceNode == undefined) {
          throw Error(
            `The architecture is invalid, the entity '${relat.caller.id}' cannot be found.`
          );
        }
        this.addOneEdge(
          ResourceEntity.create(sourceNode as Resource),
          RelationshipEntity.create(targetNode)
        );

        relat.arguments.forEach((arg) => {
          switch (arg.type) {
            case "text":
              return;

            case "resource":
            case "capturedProperty": {
              const sourceNode = this.archRef.findResource(arg.resourceId);
              if (sourceNode == undefined) {
                throw Error(
                  `The architecture is invalid, the entity '${arg.resourceId}' cannot be found.`
                );
              }
              this.addOneEdge(
                ResourceEntity.create(sourceNode),
                RelationshipEntity.create(targetNode)
              );
              break;
            }

            case "closure": {
              const sourceNode = this.archRef.findClosure(arg.closureId);
              if (sourceNode == undefined) {
                throw Error(
                  `The architecture is invalid, the entity '${arg.closureId}' cannot be found.`
                );
              }
              this.addOneEdge(
                BundleEntity.create(sourceNode),
                RelationshipEntity.create(targetNode)
              );
              break;
            }
          }
        });
      });
  }

  // Method Call & Property Access: The 'from' property depends on the 'to' property.
  // Thus, the edge originates from 'to' and points towards 'from'.
  private addEdgesOfRelationship_MethodCallAndPropertyAccess() {
    this.archRef.relationships
      .filter(
        (relat) =>
          relat.type === RelationshipType.Client || relat.type === RelationshipType.CapturedProperty
      )
      .forEach((r) => {
        const relat = r as ClientRelationship | CapturedPropertyRelationship;
        const targetNode = this.archRef.findClosure(relat.bundle.id);
        if (targetNode == undefined) {
          throw Error(
            `The architecture is invalid, the entity '${relat.bundle.id}' cannot be found.`
          );
        }

        const sourceNode = this.archRef.findResource(relat.resource.id);
        if (sourceNode == undefined) {
          throw Error(
            `The architecture is invalid, the entity '${relat.resource.id}' cannot be found.`
          );
        }
        this.addOneEdge(ResourceEntity.create(sourceNode), BundleEntity.create(targetNode));
      });
  }

  private addOneEdge(sourceNode: Entity, targetNode: Entity) {
    const sourceIdx = genNodeIndex(sourceNode);
    const targetIdx = genNodeIndex(targetNode);
    if (!this.graph[sourceIdx]) {
      this.graph[sourceIdx] = [];
    }
    this.graph[sourceIdx].push(targetIdx);
  }
}

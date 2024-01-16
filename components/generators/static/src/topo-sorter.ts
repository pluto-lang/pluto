import { createHash } from "crypto";
import { Architecture, Relationship, Closure, Resource, RelatType } from "@plutolang/base/arch";

type Entity = Resource | Closure | Relationship;

type EntityMap = Record<string, Entity>;
function genNodeIndex(node: Entity): string {
  const hash = createHash("md5").update(JSON.stringify(node)).digest("hex").substring(0, 8);
  if (node instanceof Resource) {
    return `resource_${hash}`;
  } else if (node instanceof Closure) {
    return `closure_${hash}`;
  } else {
    return `relationship_${hash}`;
  }
}

type Graph = Record<string, string[]>;

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
      ...this.archRef.resources,
      ...this.archRef.closures,
      ...this.archRef.relationships.filter((relat) => relat.type === RelatType.Create),
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
      resource.parameters
        .filter((param) => param.type === "closure")
        .forEach((param) => {
          const sourceNode = this.archRef.findClosure(param.value);
          if (sourceNode == undefined) {
            throw Error(
              `The architecture is invalid, the closure '${param.value}' cannot be found.`
            );
          }
          this.addOneEdge(sourceNode, targetNode);
        });
    });
  }

  // Create: The 'Create' relationship node depends on both the 'from' and 'to' properties.
  // Thus, the edge originates from 'from' and 'to' and points towards the relationship node.
  private addEdgesOfRelationship_Create() {
    this.archRef.relationships
      .filter((relat) => relat.type === RelatType.Create)
      .forEach((relat) => {
        const targetNode = relat;
        const sourceNode = this.archRef.findResourceOrClosure(relat.from);
        if (sourceNode == undefined) {
          throw Error(`The architecture is invalid, the entity '${relat.from}' cannot be found.`);
        }
        this.addOneEdge(sourceNode, targetNode);

        relat.to.forEach((to) => {
          const sourceNode = this.archRef.findResourceOrClosure(to);
          if (sourceNode == undefined) {
            throw Error(`The architecture is invalid, the entity '${to}' cannot be found.`);
          }
          this.addOneEdge(sourceNode, targetNode);
        });
      });
  }

  // Method Call & Property Access: The 'from' property depends on the 'to' property.
  // Thus, the edge originates from 'to' and points towards 'from'.
  private addEdgesOfRelationship_MethodCallAndPropertyAccess() {
    this.archRef.relationships
      .filter(
        (relat) => relat.type === RelatType.MethodCall || relat.type === RelatType.PropertyAccess
      )
      .forEach((relat) => {
        const targetNode = this.archRef.findResourceOrClosure(relat.from);
        if (targetNode == undefined) {
          throw Error(`The architecture is invalid, the entity '${relat.from}' cannot be found.`);
        }

        relat.to.forEach((to) => {
          const sourceNode = this.archRef.findResourceOrClosure(to);
          if (sourceNode == undefined) {
            throw Error(`The architecture is invalid, the entity '${to}' cannot be found.`);
          }
          this.addOneEdge(sourceNode, targetNode);
        });
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

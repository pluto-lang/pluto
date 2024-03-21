import { ParseNode } from "pyright-internal/dist/parser/parseNodes";

/**
 * A map that stores special nodes. Key is the full qualified name of the special type. Value is an
 * array of nodes.
 */
export class SpecialNodeMap<T extends ParseNode> {
  private readonly map: Map<string, T[]> = new Map();

  public addNode(key: string, node: T): void {
    if (!this.map.has(key)) {
      this.map.set(key, []);
    }
    this.map.get(key)!.push(node);
  }

  public getNodeById(nodeId: number, key?: string): T | undefined {
    if (key) {
      const nodes = this.map.get(key);
      return nodes?.find((node) => node.id === nodeId);
    }

    for (const nodes of this.map.values()) {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) return node;
    }
    return undefined;
  }

  public getNodesByType(specialTypeName: string): T[] | undefined {
    return this.map.get(specialTypeName);
  }

  public getSpicalTypes(): string[] {
    return Array.from(this.map.keys());
  }
}

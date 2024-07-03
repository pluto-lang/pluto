import * as path from "path";
import { describe, it, expect } from "vitest";
import { TopoSorter } from "../../arch/topo-sorter";
import {
  Architecture,
  EntityType,
  RelatType,
  RelationshipEntity,
  parseArchFromYaml,
} from "../../arch";
import { readFileSync } from "fs";

const FIXTURES_DIRPATH = path.resolve(__dirname, "fixtures");

describe("TopoSort.topologySort", () => {
  it("should throw an error if there is a cycle in the graph", () => {
    const yamlStr = readFileSync(path.resolve(FIXTURES_DIRPATH, "yamls/invalid-cycle-exists.yml"));
    const arch: Architecture = parseArchFromYaml(yamlStr.toString());

    const topoSort = new TopoSorter(arch);
    expect(() => topoSort.topologySort()).toThrow("There is a cycle in the graph.");
  });

  it("should be the 'get' node at last", () => {
    const yamlStr = readFileSync(
      path.resolve(FIXTURES_DIRPATH, "yamls/valid-last-entity-is-get.yml")
    );
    const arch: Architecture = parseArchFromYaml(yamlStr.toString());

    const topoSort = new TopoSorter(arch);
    const nodes = topoSort.topologySort();

    expect(nodes).toHaveLength(4);

    expect(nodes[nodes.length - 1].type).toBe(EntityType.Relationship);

    const lastNode = nodes[nodes.length - 1] as RelationshipEntity;
    expect(lastNode.relationship).toBe(arch.relationships.find((r) => r.type === RelatType.Create));
  });
});

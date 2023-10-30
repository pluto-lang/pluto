import { Relationship } from "./relationship";
import { Resource } from "./resource";
import * as yaml from "js-yaml";

export class Architecture {
  readonly resources: { [name: string]: Resource };
  readonly relationships: Relationship[];

  constructor() {
    this.resources = {};
    this.relationships = [];
  }

  public addResource(res: Resource) {
    if (res.name in this.resources) {
      throw new Error(`there is a resource with same name '${res.name}'`);
    }
    this.resources[res.name] = res;
  }

  public getResource(name: string): Resource {
    if (name in this.resources) {
      return this.resources[name];
    }
    throw new Error(`there is no resource with name '${name}'`);
  }

  public addRelationship(relat: Relationship) {
    this.relationships.push(relat);
  }

  public toYaml(): string {
    const resourceMap: { [name: string]: { [key: string]: unknown } } = {};
    for (const resName in this.resources) {
      const res = this.resources[resName];
      resourceMap[resName] = {
        type: res.type,
        locations: res.locations,
        parameters: res.parameters,
      };
    }

    const relatList: object[] = [];
    for (const relat of this.relationships) {
      const r = {
        from: relat.from.name,
        to: relat.to.name,
        type: relat.type,
        operation: relat.operation,
        parameters: relat.parameters,
      };
      relatList.push(r);
    }

    return yaml.dump({ resources: resourceMap, relationships: relatList });
  }
}

export function parseArchFromYaml(yamlSource: string): Architecture {
  const yamlObj = yaml.load(yamlSource) as Architecture;
  return yamlObj;
}

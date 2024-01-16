import * as yaml from "js-yaml";
import { Closure } from "./closure";
import { Entity, Relationship } from "./relationship";
import { Resource } from "./resource";

export class Architecture {
  public readonly extras: Record<string, any> = {};

  private readonly _resources: Resource[] = [];
  private readonly _closures: Closure[] = [];
  private readonly _relationships: Relationship[] = [];

  constructor() {}

  public get resources(): readonly Resource[] {
    return this._resources;
  }

  public get closures(): readonly Closure[] {
    return this._closures;
  }

  public get relationships(): readonly Relationship[] {
    return this._relationships;
  }

  public addResource(resource: Resource) {
    if (this._resources.findIndex((r) => r.id === resource.id) !== -1) {
      throw new Error(`Resource '${resource.id}' already exists`);
    }
    this._resources.push(resource);
  }

  public findResource(id: string): Resource | undefined {
    return this._resources.find((r) => r.id === id);
  }

  public addClosure(closure: Closure) {
    if (this._closures.findIndex((c) => c.id === closure.id) !== -1) {
      throw new Error(`Compute closure '${closure.id}' already exists`);
    }
    this._closures.push(closure);
  }

  public findClosure(id: string): Closure | undefined {
    return this._closures.find((c) => c.id === id);
  }

  public findResourceOrClosure(entity: Entity): Resource | Closure | undefined {
    if (entity.type === "resource") {
      return this.findResource(entity.id);
    } else if (entity.type === "closure") {
      return this.findClosure(entity.id);
    }
    throw new Error(
      `The entity '${entity.id}' type is '${entity.type}', not a resource or closure`
    );
  }

  public addRelationship(relat: Relationship) {
    this._relationships.push(relat);
  }

  public toYaml(): string {
    return yaml.dump(
      {
        resources: this._resources,
        closures: this._closures,
        relationships: this._relationships,
        extras: this.extras,
      },
      {
        indent: 2,
        skipInvalid: true,
        noArrayIndent: true,
        replacer: skipNull,
      }
    );

    function skipNull(_: string, value: any) {
      // Filtering out properties
      if (
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0) || // empty array
        (value && typeof value === "object" && Object.keys(value).length === 0) // empty object
      ) {
        return undefined; // Skip key
      }
      return value;
    }
  }
}

export function parseArchFromYaml(yamlSource: string): Architecture {
  const yamlObj = yaml.load(yamlSource) as any;
  const arch = new Architecture();
  Object.assign(arch, {
    _resources: yamlObj.resources,
    _closures: yamlObj.closures,
    _relationships: yamlObj.relationships,
    extras: yamlObj.extras,
  });
  return arch;
}

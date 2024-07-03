import { Closure } from "./closure";
import { Resource } from "./resource";
import { Relationship } from "./relationship";

export enum EntityType {
  Resource = "resource",
  Bundle = "bundle",
  Relationship = "relationship",
}

export interface ResourceEntity {
  type: EntityType.Resource;
  resource: Resource;
}

export namespace ResourceEntity {
  export function create(resource: Resource): ResourceEntity {
    return { type: EntityType.Resource, resource };
  }
}

export interface BundleEntity {
  type: EntityType.Bundle;
  closure: Closure;
}

export namespace BundleEntity {
  export function create(closure: Closure): BundleEntity {
    return { type: EntityType.Bundle, closure };
  }
}

export interface RelationshipEntity {
  type: EntityType.Relationship;
  relationship: Relationship;
}

export namespace RelationshipEntity {
  export function create(relationship: Relationship): RelationshipEntity {
    return { type: EntityType.Relationship, relationship };
  }
}

export type Entity = ResourceEntity | BundleEntity | RelationshipEntity;

import _ from "lodash";
import { Closure } from "./closure";
import { Argument } from "./argument";
import { Resource } from "./resource";

export function sameRelationship(relat1: Relationship, relat2: Relationship): boolean {
  return _.isEqual(relat1, relat2);
}

export enum RelationshipType {
  Infrastructure = "infrastructure",
  Client = "client",
  CapturedProperty = "capturedProperty",
}

interface RelationshipBase {
  readonly type: RelationshipType;
}

export interface InfraRelationship extends RelationshipBase {
  readonly type: RelationshipType.Infrastructure;
  readonly caller: Resource;
  readonly operation: string;
  readonly arguments: Argument[];
}

export namespace InfraRelationship {
  export function create(caller: Resource, operation: string, args: Argument[]): InfraRelationship {
    const relationship: InfraRelationship = {
      type: RelationshipType.Infrastructure,
      caller,
      operation,
      arguments: args,
    };
    return relationship;
  }
}

export interface ClientRelationship extends RelationshipBase {
  readonly type: RelationshipType.Client;
  readonly bundle: Closure;
  readonly resource: Resource;
  readonly operation: string;
}

export namespace ClientRelationship {
  export function create(
    bundle: Closure,
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

export interface CapturedPropertyRelationship extends RelationshipBase {
  readonly type: RelationshipType.CapturedProperty;
  readonly bundle: Closure;
  readonly resource: Resource;
  readonly property: string;
}

export namespace CapturedPropertyRelationship {
  export function create(
    bundle: Closure,
    resource: Resource,
    property: string
  ): CapturedPropertyRelationship {
    const relationship: CapturedPropertyRelationship = {
      type: RelationshipType.CapturedProperty,
      bundle,
      resource,
      property,
    };
    return relationship;
  }
}

export type Relationship = InfraRelationship | ClientRelationship | CapturedPropertyRelationship;

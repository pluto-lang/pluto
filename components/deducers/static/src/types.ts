import ts from "typescript";
import { arch } from "@plutolang/base";
import { ImportElement } from "./imports";

export interface VisitResult {
  resourceRelatInfos?: ResourceRelationshipInfo[];
  resourceVarInfos?: ResourceVariableInfo[];
}

export function concatVisitResult(...visitResults: (VisitResult | undefined)[]): VisitResult {
  const resourceRelatInfos: ResourceRelationshipInfo[] = [];
  const resourceVarInfos: ResourceVariableInfo[] = [];
  for (const visitResult of visitResults) {
    if (!visitResult) {
      continue;
    }
    if (visitResult.resourceRelatInfos != undefined) {
      resourceRelatInfos.push(...visitResult.resourceRelatInfos);
    }
    if (visitResult.resourceVarInfos != undefined) {
      resourceVarInfos.push(...visitResult.resourceVarInfos);
    }
  }
  return {
    resourceRelatInfos,
    resourceVarInfos,
  };
}

export interface ResourceVariableInfo {
  varName: string;
  resourceName?: string;
  resourceConstructInfo: ResourceConstructInfo;
}

export interface ResourceRelationshipInfo {
  fromVarName: string;
  toVarNames: string[];
  type: arch.RelationshipType;
  operation: string;
  parameters: ParameterInfo[];
}

export interface ResourceConstructInfo {
  // The expression that constructs the resource.
  constructExpression: string;
  // The information of the package from which the resource type is imported.
  importElements: ImportElement[];
  // The constructor parameters.
  parameters?: ParameterInfo[];
  locations: Location[];
}

export type ParameterInfo = TextParameterInfo | ClosureParameterInfo | PropertyParameterInfo;

export interface BaseParameterInfo {
  type: "text" | "closure" | "property";
  name: string;
  order: number;
  expression?: ts.Expression;
}

interface TextParameterInfo extends BaseParameterInfo {
  type: "text";
}

interface ClosureParameterInfo extends BaseParameterInfo {
  type: "closure";
  closureName: string;
}

interface PropertyParameterInfo extends BaseParameterInfo {
  type: "property";
  resourceVarName: string;
  property: string;
}

export interface Location {
  file: string;
  depth: number; // Position in the call chain, start from zero.
  start: string; // Format: (row,col), start from zero.
  end: string; // Format: (row,col), start from zero.
}

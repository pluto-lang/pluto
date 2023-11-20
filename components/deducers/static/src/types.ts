import ts from "typescript";
import { arch } from "@plutolang/base";
import { ImportElement } from "./imports";

export interface ResourceVariableInfo {
  varName: string;
  resourceConstructInfo: ResourceConstructInfo;
}

export interface ResourceRelationshipInfo {
  fromVarName: string;
  toVarNames: string[];
  type: arch.RelatType;
  operation: string;
  parameters: ParameterInfo[];
}

export interface ResourceRelatVarUnion {
  resourceRelatInfos: ResourceRelationshipInfo[];
  // The resources that are created in the arguments of the call.
  resourceVarInfos: ResourceVariableInfo[];
}

export interface ResourceConstructInfo {
  // The expression that constructs the resource.
  constructExpression: string;
  // The information of the package from which the resource type is imported.
  importElements: ImportElement[];
  // The constructor parameters.
  parameters?: ts.Expression[];
  location: Location;
}

export interface ParameterInfo {
  name: string; // The parameter name in the function signature.
  resourceName?: string;
  expression: ts.Expression;
  order: number;
}

export interface Location {
  file: string;
  start: string; // Format: (row,col), start from zero.
  end: string; // Format: (row,col), start from zero.
}

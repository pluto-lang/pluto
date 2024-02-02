import { Parameter } from "./parameter";

export enum RelatType {
  Create = "Create",
  MethodCall = "MethodCall",
  PropertyAccess = "PropertyAccess",
}

export interface IdWithType {
  id: string;
  type: "resource" | "closure";
}

export class Relationship {
  public readonly extras: Record<string, any> = {};

  /**
   * @param {IdWithType} from - The source node.
   * @param {IdWithType[]} to - The target nodes.
   * @param {RelatType} type
   * @param {string} operation
   * @param {Parameter[]} parameters
   */
  constructor(
    public readonly from: IdWithType,
    public readonly to: IdWithType[],
    public readonly type: RelatType,
    public readonly operation: string,
    public readonly parameters: Parameter[] = []
  ) {}

  public getParamString(): string {
    this.parameters.sort((a, b) => a.index - b.index);
    return this.parameters.map((item) => item.value).join(", ");
  }
}

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

export function isRelationship(obj: any): obj is Relationship {
  const fakeIdWithType: IdWithType = { id: "", type: "resource" };
  const fakeRelationship = new Relationship(
    fakeIdWithType,
    [fakeIdWithType],
    RelatType.Create,
    "",
    []
  );
  const props = Object.getOwnPropertyNames(fakeRelationship);
  for (const prop of props) {
    if (!(prop in obj) || typeof (fakeRelationship as any)[prop] !== typeof obj[prop]) {
      // If the property is not in the object or the type is different, return false.
      return false;
    }
  }
  return true;
}

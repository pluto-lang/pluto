import { Parameter } from "./parameter";

export class Resource {
  public readonly extras: Record<string, any> = {};

  /**
   * @param {string} id - The unique identifier of the resource, which varies for each individual
   * resource.
   * @param {string} name - The name of the resource provided by the user.
   * @param {string} type - The type of the resource, in the format: 'package.type', for instance,
   * '@plutolang/pluto.Router'.
   * @param {Parameter[]} parameters -
   */
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: string,
    public readonly parameters: Parameter[] = []
  ) {}

  public getParamString(): string {
    this.parameters.sort((a, b) => a.index - b.index);
    return this.parameters.map((item) => item.value).join(", ");
  }
}

export function isResource(obj: any): obj is Resource {
  const fakeResource = new Resource("", "", "", []);
  const props = Object.getOwnPropertyNames(fakeResource);
  for (const prop of props) {
    if (!(prop in obj) || typeof (fakeResource as any)[prop] !== typeof obj[prop]) {
      // If the property is not in the object or the type is different, return false.
      return false;
    }
  }
  return true;
}

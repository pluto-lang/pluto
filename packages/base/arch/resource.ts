import { Argument } from "./argument";

export interface Resource {
  /**
   * The unique identifier of the resource, which varies for each individual resource.
   */
  readonly id: string;
  /**
   * The name of the resource provided by the user.
   */
  readonly name: string;
  /**
   * The type of the resource, in the format: 'package.type', for instance,
   * '@plutolang/pluto.Router'.
   */
  readonly type: string;
  /**
   * The arguments for creating the resource.
   */
  readonly arguments: Argument[];
  readonly extras: Record<string, any>;
}

export namespace Resource {
  export function create(id: string, name: string, type: string, args: Argument[]): Resource {
    return {
      id,
      name,
      type,
      arguments: args,
      extras: {},
    };
  }
}

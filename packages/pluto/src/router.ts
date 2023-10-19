import { FnResource, Resource } from "@pluto/base";

export type Request = any;

export interface RequestHandler extends FnResource {
  (request: Request): void;
}

/**
 * Define the methods for Router, which operate during compilation.
 */
export interface RouterInfra {
  get(path: string, fn: RequestHandler): void;
  post(path: string, fn: RequestHandler): void;
  put(path: string, fn: RequestHandler): void;
  delete(path: string, fn: RequestHandler): void;
}

export interface RouterInfraOptions {}
/**
 * The options for creating a client, which can be used at runtime.
 */
export interface RouterOptions extends RouterInfraOptions {}

// TODO: abstract class
export class Router implements Resource {
  constructor(name: string, opts?: RouterOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: any): void {
    name;
    opts;
    throw new Error("This method should not be called. The router should not have a client.");
  }
}

export interface Router extends RouterInfra {}

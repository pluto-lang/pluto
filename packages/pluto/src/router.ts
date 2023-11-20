import { FnResource, Resource } from "@plutolang/base";

export interface HttpRequest {
  path: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: string | undefined;
}

export interface HttpResponse {
  statusCode: number;
  body: string;
}

export interface RequestHandler extends FnResource {
  (request: HttpRequest): Promise<HttpResponse>;
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
}

export interface Router extends RouterInfra, Resource {}

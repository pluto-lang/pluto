import {
  FnResource,
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  runtime,
  utils,
} from "@plutolang/base";
import { shared } from "./clients";

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
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface RouterOptions {}

/**
 * Define the access methods for Router that operate during runtime.
 */
export interface IRouterClientApi extends IResourceClientApi {}

/**
 * Define the methods for Router, which operate during compilation.
 */
export interface IRouterInfraApi extends IResourceInfraApi {
  get(path: string, fn: RequestHandler): void;
  post(path: string, fn: RequestHandler): void;
  put(path: string, fn: RequestHandler): void;
  delete(path: string, fn: RequestHandler): void;
}

/**
 * Define the properties for Router that are captured at compile time and accessed during runtime.
 */
export interface IRouterCapturedProps extends IResourceCapturedProps {
  get url(): string;
}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IRouterClient = IRouterClientApi & IRouterCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IRouterInfra = IRouterInfraApi & IRouterCapturedProps;

// TODO: abstract class
export class Router implements IResource {
  constructor(name: string, opts?: RouterOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: RouterOptions): IRouterClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case runtime.Type.AWS:
      case runtime.Type.K8s:
        return new shared.RouterClient(name, opts);
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }
}

export interface Router extends IResource, IRouterClient, IRouterInfra {}

import {
  FnResource,
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  PlatformType,
  simulator,
  utils,
} from "@plutolang/base";
import { shared } from "./clients";
import { AnyFunction } from "./function";

export interface HttpRequest {
  path: string;
  method: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | string[] | undefined>;
  body: string | null;
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
export interface RouterOptions {
  /**
   * Whether to enable CORS for the router. If true, the router will respond to preflight requests
   * and include the appropriate CORS headers in responses. @default true
   */
  cors?: boolean;

  /**
   * Host address for simulating the website when running the project with `pluto run`. If not
   * provided, it will be `localhost`.
   */
  simHost?: string;

  /**
   * Port number for simulating the website when running the project with `pluto run`. If not
   * provided, it will be a random port.
   */
  simPort?: string;
}

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
  all(path: string, fn: AnyFunction, raw?: boolean): void;
}

/**
 * Define the properties for Router that are captured at compile time and accessed during runtime.
 */
export interface IRouterCapturedProps extends IResourceCapturedProps {
  url(): string;
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
      case PlatformType.AWS:
      case PlatformType.K8s:
      case PlatformType.AliCloud:
        return new shared.RouterClient(name, opts);
      case PlatformType.Simulator: {
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        const resourceId = utils.genResourceId(Router.fqn, name);
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, resourceId);
      }
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }

  public static fqn = "@plutolang/pluto.Router";
}

export interface Router extends IResource, IRouterClient, IRouterInfra {}

export interface UrlPart {
  readonly content: string;
  readonly isParam?: boolean;
  readonly isWildcard?: boolean;
}

/**
 * Parse a URL into its parts. The parts are separated by slashes, and can be either static parts,
 * parameters, or wildcards. The rules are:
 * 1. Static parts are just strings, like "foo" or "bar".
 * 2. Parameters are strings that start with a colon, like ":id".
 * 3. Wildcards are strings that are just "*". There can only be one wildcard, and it must be at the
 *    end of the URL.
 * @param url - The URL to parse.
 * @returns - An array of URL parts.
 */
export function parseUrl(url: string): UrlPart[] {
  if (!url.startsWith("/")) {
    throw new Error("URL must start with a slash.");
  }
  if (url.split("*").length > 2 || (url.split("*").length === 2 && !url.endsWith("*"))) {
    // There can only be one wildcard, and it must be at the end of the URL.
    throw new Error("URL can only contain one wildcard, and it must be at the end of the URL.");
  }

  const parts = url.split("/").filter((part) => part !== "");
  return parts.map((part) => {
    if (part.startsWith(":")) {
      return { content: part.slice(1), isParam: true };
    }
    if (part === "*") {
      return { content: part, isWildcard: true };
    }
    return { content: part };
  });
}

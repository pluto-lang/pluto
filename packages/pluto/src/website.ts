import {
  IResource,
  IResourceClientApi,
  IResourceInfraApi,
  PlatformType,
  utils,
} from "@plutolang/base";
import { shared } from "./clients";

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface WebsiteOptions {}

/**
 * Don't export these methods to developers.
 * These methods are only used internally by the cli.
 */
export interface IWebsiteClientApi extends IResourceClientApi {}

export interface IWebsiteInfraApi extends IResourceInfraApi {
  addEnv(key: string, value: string): void;
}

export interface IWebsiteCapturedProps extends IResourceInfraApi {
  url(): string;
}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IWebsiteClient = IWebsiteClientApi & IWebsiteCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IWebsiteInfra = IWebsiteInfraApi & IWebsiteCapturedProps;

export class Website implements IResource {
  constructor(path: string, name?: string, opts?: WebsiteOptions) {
    path;
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(path: string, name?: string, opts?: WebsiteOptions): IWebsiteClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new shared.WebsiteClient(path, name, opts);
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
    path;
    name;
    opts;
  }

  public static fqn = "@plutolang/pluto.Website";
}

export interface Website extends IResource, IWebsiteClient, IWebsiteInfra {}

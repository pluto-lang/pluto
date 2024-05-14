import {
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  PlatformType,
  utils,
} from "@plutolang/base";
import { aws } from "./clients";

export interface ISecretClientApi extends IResourceClientApi {
  /**
   * Get the secret value.
   */
  get(): Promise<string>;
}

export interface ISecretInfraApi extends IResourceInfraApi {}
export interface ISecretCapturedProps extends IResourceCapturedProps {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type ISecretClient = ISecretClientApi & ISecretCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type ISecretInfra = ISecretInfraApi & ISecretCapturedProps;

export class Secret implements IResource {
  constructor(name: string, value: string) {
    name;
    value;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, value: string): ISecretClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new aws.Secret(name, value);
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }

  public static fqn = "@plutolang/pluto.Secret";
}

export interface Secret extends IResource, ISecretClient, ISecretInfra {}

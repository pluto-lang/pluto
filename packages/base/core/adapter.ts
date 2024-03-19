import { LanguageType } from "../language";
import { Architecture } from "../arch";
import { BaseComponent, BasicArgs } from "./base-component";

export enum ResourceInstanceStatus {
  Undeployed = "undeployed",
  Deploying = "deploying",
  Deployed = "deployed",
  Deleted = "deleted",
}

/**
 * The display information of a resource provided by the provisioning engine.
 */
export interface ResourceInstance {
  id: string;
  type: string;
  name: string;
  status: ResourceInstanceStatus;
  parent: string;
  extras?: Record<string, any>;
}

export interface NewAdapterArgs extends BasicArgs {
  readonly archRef: Architecture;
  /** The absolute path to the entry point. */
  readonly entrypoint: string;

  readonly language: LanguageType;

  /**
   * The absolute path to the state directory, used for storing the private state generated while
   * the adapter is working. This directory should not be made public.
   */
  readonly stateDir: string;
}

export interface PreviewResult {
  readonly instances: ResourceInstance[];
}

export interface StateResult {
  readonly instances: ResourceInstance[];
}

export interface DeployOptions {
  /**
   * If it is true, it will cancel the update process if there is one.
   * @default false
   */
  force?: boolean;
}

export interface DeployResult {
  readonly outputs: Record<string, any>;
}

export interface DestroyOptions {
  /**
   * If it is true, it will cancel the update process if there is one.
   * @default false
   */
  force?: boolean;
}

export abstract class Adapter extends BaseComponent {
  protected readonly archRef: Architecture;
  /**
   * The absolute path to the infrastructure provisioning file.
   */
  protected readonly entrypoint: string;

  protected readonly language: LanguageType;

  /**
   * The absolute path to the state directory of adapter, used for storing the private state
   * generated while the adapter is working. And this directory is unique for each stack. The
   * adapter can use this directory to store the stateful data, like the server URL of the simulator
   * or the passphrase used for the pulumi local backend.
   *
   * Note: This directory should not be made public.
   */
  protected readonly stateDir: string;

  constructor(args: NewAdapterArgs) {
    super(args);
    this.archRef = args.archRef;
    this.entrypoint = args.entrypoint;
    this.language = args.language;
    this.stateDir = args.stateDir;
  }

  public abstract state(): Promise<StateResult>;
  public abstract deploy(options?: DeployOptions): Promise<DeployResult>;
  public abstract destroy(options?: DestroyOptions): Promise<void>;
}

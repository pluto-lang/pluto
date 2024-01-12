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
  readonly workdir: string;
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
  protected readonly entrypoint: string;
  protected readonly workdir: string;

  constructor(args: NewAdapterArgs) {
    super(args);
    this.archRef = args.archRef;
    this.entrypoint = args.entrypoint;
    this.workdir = args.workdir;
  }

  public abstract state(): Promise<StateResult>;
  public abstract deploy(options?: DeployOptions): Promise<DeployResult>;
  public abstract destroy(options?: DestroyOptions): Promise<void>;
  /**
   * Adapter can have some stateful properties, like the server URL of the simulator
   * or the passphrase used for the pulumi local backend. This method is used to
   * save this data to a local file, which can be helpful in creating an adapter
   * with the same state in the future.
   */
  public abstract dump(): string;
  /**
   * Load the state data dumped last time.
   * @param config
   */
  public abstract load(data: string): void;
}

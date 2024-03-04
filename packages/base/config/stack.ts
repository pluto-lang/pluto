import { ProvisionType } from "../provision";
import { PlatformType } from "../platform";

export interface StackState {
  /** The file path to the last deduction result. */
  lastArchRefFile?: string;
  /** The argument used in the last adapter construction. */
  lastProvisionFile?: string;

  deployed: boolean;
}

export class Stack {
  /** The configuration items are used for components, such as the kubeconfig path. */
  public configs: Record<string, any> = {};

  public state: StackState = {
    lastArchRefFile: undefined,
    lastProvisionFile: undefined,
    deployed: false,
  };

  constructor(
    /** The stack name. */
    public readonly name: string,
    /** The type of target platform. */
    public readonly platformType: PlatformType,
    /** The type of provisioning engine. */
    public readonly provisionType: ProvisionType
  ) {}

  public set archRefFile(filepath: string) {
    this.state.lastArchRefFile = filepath;
  }

  public get archRefFile(): string | undefined {
    return this.state.lastArchRefFile;
  }

  public set provisionFile(provisionFile: string) {
    this.state.lastProvisionFile = provisionFile;
  }

  public get provisionFile(): string | undefined {
    return this.state.lastProvisionFile;
  }

  public setDeployed() {
    this.state.deployed = true;
  }

  public setUndeployed() {
    this.state.deployed = false;
  }

  public isDeployed(): boolean {
    return this.state.deployed;
  }

  public deepCopy(): Stack {
    const clonedStack = new Stack(this.name, this.platformType, this.provisionType);
    clonedStack.configs = { ...this.configs };
    clonedStack.state.lastArchRefFile = this.state.lastArchRefFile;
    clonedStack.state.lastProvisionFile = this.state.lastProvisionFile;
    clonedStack.state.deployed = this.state.deployed;
    return clonedStack;
  }
}

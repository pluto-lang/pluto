import * as engine from "../engine";
import * as runtime from "../runtime";

export class Stack {
  /** The configuration items are used for components, such as the kubeconfig path. */
  public configs: Record<string, any> = {};
  /** The file path to the last deduction result. */
  private lastArchRefFile?: string;
  /** The argument used in the last adapter construction. */
  private lastProvisionFile?: string;
  /** The state data of adapter. */
  private adapterData?: string;

  private deployed: boolean = false;

  constructor(
    /** The stack name. */
    public readonly name: string,
    /** The type of target platform. */
    public readonly platformType: runtime.Type,
    /** The type of provisioning engine. */
    public readonly engineType: engine.Type
  ) {}

  public set archRefFile(filepath: string) {
    this.lastArchRefFile = filepath;
  }

  public get archRefFile(): string | undefined {
    return this.lastArchRefFile;
  }

  public set provisionFile(provisionFile: string) {
    this.lastProvisionFile = provisionFile;
  }

  public get provisionFile(): string | undefined {
    return this.lastProvisionFile;
  }

  public set adapterState(data: string) {
    this.adapterData = data;
  }

  public get adapterState(): string | undefined {
    return this.adapterData;
  }

  public setDeployed() {
    this.deployed = true;
  }

  public setUndeployed() {
    this.deployed = false;
  }

  public isDeployed(): boolean {
    return this.deployed;
  }

  public deepCopy(): Stack {
    const clonedStack = new Stack(this.name, this.platformType, this.engineType);
    clonedStack.configs = { ...this.configs };
    clonedStack.lastArchRefFile = this.lastArchRefFile;
    clonedStack.lastProvisionFile = this.lastProvisionFile;
    clonedStack.adapterData = this.adapterData;
    clonedStack.deployed = this.deployed;
    return clonedStack;
  }
}

import { ProvisionType, PlatformType } from "@plutolang/base";

type LazyImportFunc<K> = () => Promise<K>;
type RuntimeToImportMap<K> = { [key in PlatformType]?: LazyImportFunc<K> };
type EngineToRuntimeMap<K> = { [key in ProvisionType]?: RuntimeToImportMap<K> };

/**
 * Implementation class map that handles lazy loading of implementation classes based on platform and engine.
 */
export class ImplClassMap<T, K extends new (...args: any[]) => T> {
  private readonly resourceTypeFQN: string;
  private readonly mapping: EngineToRuntimeMap<K> = {};

  /**
   * Creates a new instance of the implementation class map.
   * @param resourceTypeFQN The fully qualified name of the resource type. This is used for error
   * messages, for example, '@plutolang/pluto.KVStore'.
   * @param initialMapping The initial mapping table.
   */
  constructor(resourceTypeFQN: string, initialMapping?: EngineToRuntimeMap<K>) {
    this.resourceTypeFQN = resourceTypeFQN;
    this.mapping = { ...this.mapping, ...initialMapping };
  }

  /**
   * Add an item to the mapping table.
   * @param platformType - The target platform.
   * @param provisionType - The target provisioning engine.
   * @param implClassImporter The implementation class.
   */
  public addItem(
    platformType: PlatformType,
    provisionType: ProvisionType,
    implClassImporter: LazyImportFunc<K>
  ): void {
    if (this.mapping[provisionType] == undefined) {
      this.mapping[provisionType] = {};
    }
    this.mapping[provisionType]![platformType] = implClassImporter;
  }

  /**
   * Loads the implementation class for the given platform and engine, or throws an error if not found.
   * @param platformType - The target platform.
   * @param provisionType - The target provisioning engine.
   * @throws Error - If the implementation class is not found.
   * @returns The implementation class.
   */
  public async loadImplClassOrThrow(
    platformType: PlatformType,
    provisionType: ProvisionType
  ): Promise<K> {
    const runtimeImportMap = this.mapping[provisionType];
    if (runtimeImportMap == undefined) {
      throw new Error(`The implementation class for '${platformType}' platform cannot be located.`);
    }

    const implClassImporter = runtimeImportMap[platformType];
    if (implClassImporter == undefined) {
      throw new Error(
        `The implementation class for the resource type '${this.resourceTypeFQN}', intended for the '${provisionType}' provisioning engine on the '${platformType}' platform, cannot be found.`
      );
    }
    return await implClassImporter();
  }

  /**
   * Creates an instance of the implementation class for the given platform and engine with the provided arguments,
   * or throws an error if not found.
   * @param platformType - The target platform.
   * @param provisionType - The target provisioning engine.
   * @param args - The arguments to pass to the implementation class constructor.
   * @throws Error - If the implementation class is not found.
   * @returns The instance of the implementation class.
   */
  public async createInstanceOrThrow(
    platformType: PlatformType,
    provisionType: ProvisionType,
    ...args: any[]
  ): Promise<T> {
    const implClass = await this.loadImplClassOrThrow(platformType, provisionType);

    const instance = new implClass(...args);

    // If there is the `init` method in the implementation class, use it to initialize the instance.
    if (typeof implClass.prototype.init === "function") {
      await (instance as any).init();
    }

    return instance;
  }
}

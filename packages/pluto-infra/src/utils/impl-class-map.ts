import { ProvisionType, PlatformType } from "@plutolang/base";

type LazyImportFunc<K> = () => Promise<K>;
type RuntimeToImportMap<K> = { [key in PlatformType]?: LazyImportFunc<K> };
type EngineToRuntimeMap<K> = { [key in ProvisionType]?: RuntimeToImportMap<K> };

/**
 * Implementation class map that handles lazy loading of implementation classes based on platform and engine.
 */
export class ImplClassMap<T, K extends new (...args: any[]) => T> {
  private readonly mapping: EngineToRuntimeMap<K> = {};

  constructor(initialMapping?: EngineToRuntimeMap<K>) {
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
        `The implementation class for '${provisionType}' provisioning engine on '${platformType}' platform cannot be located.`
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
    return new implClass(...args);
  }
}

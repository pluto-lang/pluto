import { engine, runtime } from "@plutolang/base";

type LazyImportFunc<K> = () => Promise<K>;
type RuntimeToImportMap<K> = { [key in runtime.Type]?: LazyImportFunc<K> };
type EngineToRuntimeMap<K> = { [key in engine.Type]?: RuntimeToImportMap<K> };

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
   * @param platform - The target platform.
   * @param engine - The target engine.
   * @param implClassImporter The implementation class.
   */
  public addItem(
    platform: runtime.Type,
    engine: engine.Type,
    implClassImporter: LazyImportFunc<K>
  ): void {
    if (this.mapping[engine] == undefined) {
      this.mapping[engine] = {};
    }
    this.mapping[engine]![platform] = implClassImporter;
  }

  /**
   * Loads the implementation class for the given platform and engine, or throws an error if not found.
   * @param platform - The target platform.
   * @param engine - The target engine.
   * @throws Error - If the implementation class is not found.
   * @returns The implementation class.
   */
  public async loadImplClassOrThrow(platform: runtime.Type, engine: engine.Type): Promise<K> {
    const runtimeImportMap = this.mapping[engine];
    if (runtimeImportMap == undefined) {
      throw new Error(`The implementation class for platform '${platform}' cannot be located.`);
    }

    const implClassImporter = runtimeImportMap[platform];
    if (implClassImporter == undefined) {
      throw new Error(
        `The implementation class for engine '${engine}' on platform '${platform}' cannot be located.`
      );
    }
    return await implClassImporter();
  }

  /**
   * Creates an instance of the implementation class for the given platform and engine with the provided arguments,
   * or throws an error if not found.
   * @param platform - The target platform.
   * @param engine - The target engine.
   * @param args - The arguments to pass to the implementation class constructor.
   * @throws Error - If the implementation class is not found.
   * @returns The instance of the implementation class.
   */
  public async createInstanceOrThrow(
    platform: runtime.Type,
    engine: engine.Type,
    ...args: any[]
  ): Promise<T> {
    const implClass = await this.loadImplClassOrThrow(platform, engine);
    return new implClass(...args);
  }
}

import { Module, ModuleType } from "./types";

export class ModuleSet {
  private readonly modules: Module[] = [];

  constructor() {}

  public add(module: Module): void {
    const existed = this.modules.some((existingModule) => {
      if (
        module.type === ModuleType.Local &&
        existingModule.type === ModuleType.Local &&
        module.modulePath === existingModule.modulePath
      ) {
        return true;
      }

      if (
        module.type === ModuleType.Installed &&
        existingModule.type === ModuleType.Installed &&
        module.name === existingModule.name &&
        module.version === existingModule.version
      ) {
        return true;
      }

      return false;
    });

    if (!existed) {
      this.modules.push(module);
    }
  }

  public toArray(): Module[] {
    return this.modules.concat();
  }
}

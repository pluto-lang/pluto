export type Runtime = "python3.12" | "python3.11" | "python3.10" | "python3.9" | "python3.8";
export type Architecture = "x86_64" | "arm64";

export namespace Architecture {
  export function isSupported(arch: Architecture): boolean {
    return arch === "x86_64" || arch === "arm64";
  }
}

export enum ModuleType {
  Local = "local",
  Installed = "installed",
}

interface ModuleBase {
  name: string;
  type: ModuleType;
}

export interface LocalModule extends ModuleBase {
  type: ModuleType.Local;
  modulePath: string;
}

export namespace LocalModule {
  export function create(name: string, modulePath: string): LocalModule {
    return {
      name,
      type: ModuleType.Local,
      modulePath,
    };
  }
}

export interface InstalledModule extends ModuleBase {
  type: ModuleType.Installed;
  version?: string;
}

export namespace InstalledModule {
  export function create(name: string, version?: string): InstalledModule {
    return {
      name,
      type: ModuleType.Installed,
      version,
    };
  }
}

export type Module = LocalModule | InstalledModule;

export namespace Module {
  export function same(m1: Module, m2: Module): boolean {
    if (m1.name !== m2.name || m1.type !== m2.type) {
      return false;
    }

    if (m1.type === ModuleType.Installed) {
      return m1.version === (m2 as InstalledModule).version;
    }

    return m1.modulePath === (m2 as LocalModule).modulePath;
  }
}

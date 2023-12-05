import * as vm from "vm";

export interface SandboxOptions {
  readonly env?: { [key: string]: string };
}

export class Sandbox {
  private loaded = false;
  private entrypoint: string;
  private readonly options: SandboxOptions;
  private readonly context: any = {};

  constructor(entrypoint: string, options: SandboxOptions = {}) {
    this.entrypoint = entrypoint;
    this.options = options;
    this.context = this.createContext();
  }

  private createContext() {
    const sandboxProcess = {
      ...process,
      exit: (exitCode: number) => {
        throw new Error("exit with code " + exitCode);
      },
      env: this.options.env,
    };
    for (const key in this.options.env) {
      process.env[key] = this.options.env[key];
    }

    const context = vm.createContext({
      process: sandboxProcess,
      console: console,
      exports: {},
      require,
    });

    return context;
  }

  private async loadBundleOnce() {
    if (this.loaded) {
      return;
    }

    const code = `const { default: handle } = require("${this.entrypoint}");`;

    vm.runInContext(code, this.context, {
      filename: this.entrypoint,
    });

    this.loaded = true;
  }

  public async call(...args: any[]): Promise<any> {
    await this.loadBundleOnce();

    return new Promise(($resolve, $reject) => {
      const cleanup = () => {
        delete this.context.$resolve;
        delete this.context.$reject;
      };

      this.context.$resolve = (value: any) => {
        cleanup();
        $resolve(value);
      };

      this.context.$reject = (reason?: any) => {
        cleanup();
        $reject(reason);
      };

      const code = `handle(${args.join(",")}).then($resolve).catch($reject);`;
      vm.runInContext(code, this.context, {
        filename: this.entrypoint,
      });
    });
  }
}

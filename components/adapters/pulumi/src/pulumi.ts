import { isAbsolute, join, resolve } from "path";
import { core, utils } from "@plutolang/base";
import { LocalWorkspace, Stack } from "@pulumi/pulumi/automation";
import { genPulumiConfigByRuntime } from "./utils";
import { readdirSync } from "fs";
import { ensureDirSync } from "fs-extra";

export class PulumiAdapter extends core.Adapter {
  private readonly backendPath: string;
  private passphrase: string;

  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(join(__dirname, "../package.json")).version;

  constructor(args: core.NewAdapterArgs) {
    if (!isAbsolute(args.entrypoint)) {
      throw new Error("The entrypoint provided to the adapter must be an absolute path.");
    }

    super(args);
    this.backendPath = join(utils.systemConfigDir(), "pulumi");
    ensureDirSync(this.backendPath);
    // this.passphrase = randomUUID();
    this.passphrase = "pluto";
  }

  public async state(): Promise<core.StateResult> {
    try {
      const pulumiStack = await this.createPulumiStack();
      const stackState = await pulumiStack.workspace.stack();
      if (!stackState) {
        throw new Error("Cannot find the target pulumi stack. Have you already deployed it?");
      }

      await pulumiStack.refresh();
      const result = await pulumiStack.exportStack();

      const instances: core.ResourceInstance[] = [];
      const resources = result.deployment.resources ?? [];
      for (const resource of resources) {
        const instance: core.ResourceInstance = {
          id: resource["urn"],
          name: resource["urn"].split("::").pop(),
          type: resource["type"],
          status: core.ResourceInstanceStatus.Deployed,
          parent: resource["parent"],
        };
        instances.push(instance);
      }
      return { instances };
    } catch (e) {
      if (e instanceof Error) {
        throw new Error("Met error during run 'pulumi state', " + e.message);
      } else {
        throw new Error("Met error during run 'pulumi state', " + e);
      }
    }
  }

  public async deploy(opts: core.DeployOptions = {}): Promise<core.DeployResult> {
    try {
      const pulumiStack = await this.createPulumiStack();
      if (this.updateInProgress()) {
        if (opts.force) {
          await pulumiStack.cancel();
        } else {
          throw new Error(
            "This stack is currently being updated. If you want to update forcefully, you can use the --force option."
          );
        }
      }

      const result = await pulumiStack.up();
      return { outputs: result.outputs["default"]?.value ?? {} };
    } catch (e) {
      if (e instanceof Error) {
        throw new Error("Met error during run 'pulumi update', " + e.message);
      } else {
        throw new Error("Met error during run 'pulumi update', " + e);
      }
    }
  }

  public async destroy(opts: core.DestroyOptions = {}): Promise<void> {
    try {
      const pulumiStack = await this.createPulumiStack();
      if (this.updateInProgress()) {
        if (opts.force) {
          await pulumiStack.cancel();
        } else {
          throw new Error(
            "This stack is currently being updated. If you want to update forcefully, you can use the --force option."
          );
        }
      }

      await pulumiStack.refresh();
      await pulumiStack.destroy();
      await pulumiStack.workspace.removeStack(this.stack.name);
    } catch (e) {
      if (e instanceof Error) {
        throw new Error("Met error during run 'pulumi destroy', " + e.message);
      } else {
        throw new Error("Met error during run 'pulumi destroy', " + e);
      }
    }
  }

  public dump(): string {
    return JSON.stringify({
      passphrase: this.passphrase,
    });
  }

  public load(data: string): void {
    const config = JSON.parse(data);
    this.passphrase = config["passphrase"];
  }

  private async createPulumiStack(): Promise<Stack> {
    const envs: Record<string, string> = {
      PLUTO_PLATFORM_TYPE: this.stack.platformType,
      PLUTO_PROVISION_TYPE: this.stack.provisionType,
      PULUMI_CONFIG_PASSPHRASE: this.passphrase,
      WORK_DIR: this.workdir,
    };

    const pulumiStack = await LocalWorkspace.createOrSelectStack(
      {
        stackName: this.stack.name,
        workDir: this.workdir,
      },
      {
        workDir: this.workdir,
        envVars: envs,
        projectSettings: {
          runtime: "nodejs",
          name: this.project,
          main: this.entrypoint,
          backend: { url: "file://" + this.backendPath },
        },
      }
    );
    for (const key of Object.keys(envs)) process.env[key] = envs[key];

    const pulumiConfig = await genPulumiConfigByRuntime(this.stack);
    await pulumiStack.setAllConfig(pulumiConfig);
    return pulumiStack;
  }

  private updateInProgress(): boolean {
    const locksDir = resolve(
      this.backendPath,
      ".pulumi/locks/organization",
      this.project,
      this.stack.name
    );
    const files = readdirSync(locksDir);
    return files.length > 0;
  }
}

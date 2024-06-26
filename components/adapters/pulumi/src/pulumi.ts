import { ensureDirSync, existsSync, readFileSync, writeFileSync } from "fs-extra";
import { randomUUID } from "crypto";
import { isAbsolute, join, resolve } from "path";
import { PlatformType, core } from "@plutolang/base";
import { currentPlatformType } from "@plutolang/base/utils";
import { CommandError, LocalWorkspace, Stack } from "@pulumi/pulumi/automation";
import { genPulumiConfig, installPulumi, needsPulumi, updateInProgress } from "./utils";

const STATE_FILE_NAME = "pulumi-state.json";

const debugStream = process.env.LOG_LEVEL?.toUpperCase().trim() === "LOG" ? console.log : undefined;

/**
 * The status of the pulumi stack.
 * - undeployed: The stack has not been deployed.
 * - updating: The stack is being updated, including deploying and destroying.
 * - deployed: The stack has been deployed.
 *
 * State Transitions:
 *
 *  +-------------------+
 *  |   undeployed      |
 *  +-------------------+
 *          |   deploy
 *          V
 *  +------------------+
 *  |   updating       |
 *  +------------------+
 *          |   deploy
 *          V
 *  +-------------------+
 *  |   deployed        |
 *  +-------------------+
 *          |   destroy
 *          V
 *  +-------------------+
 *  |   updating        |
 *  +-------------------+
 *          |   destroy
 *          V
 *  +-------------------+
 *  |   undeployed      |
 *  +-------------------+
 */
type PulumiStatus = "undeployed" | "updating" | "deployed";

interface PulumiState {
  passphrase: string;
  status: PulumiStatus;
}

export class PulumiAdapter extends core.Adapter {
  private readonly workDir: string;

  private readonly passphrase: string;
  private status: PulumiStatus;

  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(join(__dirname, "../package.json")).version;

  constructor(args: core.NewAdapterArgs) {
    if (!isAbsolute(args.entrypoint)) {
      throw new Error("The entrypoint provided to the adapter must be an absolute path.");
    }

    super(args);

    this.workDir = join(this.stateDir, "pulumi");
    ensureDirSync(this.workDir);

    const state = this.load();
    if (state) {
      this.passphrase = state.passphrase;
      this.status = state.status;
    } else {
      this.passphrase = randomUUID();
      this.status = "undeployed";
      this.dump();
    }
  }

  public async state(): Promise<core.StateResult> {
    await this.ensurePulumi();

    try {
      const pulumiStack = await this.createPulumiStack();
      const stackState = await pulumiStack.workspace.stack();
      if (!stackState) {
        throw new Error("Cannot find the target pulumi stack. Have you already deployed it?");
      }

      // await pulumiStack.refresh({ onOutput: debugStream });
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
    await this.ensurePulumi();

    try {
      const pulumiStack = await this.createPulumiStack();
      if (
        this.status === "updating" ||
        updateInProgress(this.project, this.stack.name, this.workDir)
      ) {
        if (opts.force) {
          await pulumiStack.cancel();
        } else {
          // If the force option is not set, we will throw an error.
          throw new Error(
            "This stack is currently being updated. If you want to update forcefully, you can use the --force option."
          );
        }
      }

      this.status = "updating";
      const result = await pulumiStack.up({ onOutput: debugStream });
      this.status = "deployed";

      return { outputs: result.outputs["default"]?.value ?? {} };
    } catch (e) {
      if (process.env.DEBUG) {
        console.error(e);
      }

      if (e instanceof CommandError) {
        throw extractError(e);
      } else {
        throw e;
      }
    } finally {
      this.dump();
    }
  }

  public async destroy(opts: core.DestroyOptions = {}): Promise<void> {
    await this.ensurePulumi();

    try {
      const pulumiStack = await this.createPulumiStack();
      if (
        this.status === "updating" ||
        updateInProgress(this.project, this.stack.name, this.workDir)
      ) {
        if (opts.force) {
          await pulumiStack.cancel();
        } else {
          // If the force option is not set, we will throw an error.
          throw new Error(
            "This stack is currently being updated. If you want to update forcefully, you can use the --force option."
          );
        }
      }

      await pulumiStack.refresh();
      this.status = "updating";
      await pulumiStack.destroy({ onOutput: debugStream });
      this.status = "undeployed";

      await pulumiStack.workspace.removeStack(this.stack.name);
    } catch (e) {
      if (e instanceof Error) {
        throw new Error("Met error during run 'pulumi destroy', " + e.message);
      } else {
        throw new Error("Met error during run 'pulumi destroy', " + e);
      }
    } finally {
      this.dump();
    }
  }

  private dump(): void {
    const stateFile = resolve(this.workDir, STATE_FILE_NAME);
    const state: PulumiState = {
      passphrase: this.passphrase,
      status: this.status,
    };
    writeFileSync(stateFile, JSON.stringify(state), "utf-8");
  }

  private load(): PulumiState | undefined {
    const stateFile = resolve(this.workDir, STATE_FILE_NAME);
    if (existsSync(stateFile) === false) {
      return;
    }

    const stateData = readFileSync(stateFile, "utf-8");
    const state = JSON.parse(stateData);
    return state;
  }

  private async createPulumiStack(): Promise<Stack> {
    const envs: Record<string, string> = {
      PLUTO_PROJECT_NAME: this.project,
      PLUTO_STACK_NAME: this.stack.name,
      PLUTO_LANGUAGE_TYPE: this.language,
      PLUTO_PLATFORM_TYPE: this.stack.platformType,
      PLUTO_PROVISION_TYPE: this.stack.provisionType,
      PULUMI_CONFIG_PASSPHRASE: this.passphrase,
      WORK_DIR: this.stateDir,
    };

    const pulumiStack = await LocalWorkspace.createOrSelectStack(
      {
        stackName: this.stack.name,
        workDir: this.workDir,
      },
      {
        workDir: this.workDir,
        envVars: envs,
        projectSettings: {
          runtime: "nodejs",
          name: this.project,
          main: this.entrypoint,
          backend: { url: "file://" + this.workDir },
        },
      }
    );
    for (const key of Object.keys(envs)) process.env[key] = envs[key];

    const pulumiConfig = await genPulumiConfig(this.stack);
    pulumiConfig["pluto:projectRoot"] = { value: process.cwd() };
    await pulumiStack.setAllConfig(pulumiConfig);
    return pulumiStack;
  }

  private async ensurePulumi() {
    try {
      if (await needsPulumi()) {
        await installPulumi();
      }
    } catch (e) {
      console.error(e);
      throw new Error("Failed to install pulumi.");
    }
  }
}

class PulumiError extends Error {
  constructor(message: string, stack: string) {
    stack = stack.replace(/ {4,}/g, "    ");
    super(message);
    this.stack = `${message}\n${stack}`;
  }
}

function extractError(error: any): PulumiError {
  const pulumiOutput: string = error.commandResult.stderr || error.commandResult.stdout;

  function extractSDKError(): Error | undefined {
    // Try to extract the error message that is defined and thrown by the Pluto Infra SDK.
    const regex = /Error: ([\s\S]*?)\n([\s\S]*?)(?=\n\n)/;
    const match = pulumiOutput.match(regex);
    if (match) {
      const message = match[1];
      const stack = match[2];
      return new PulumiError(message, stack);
    }
    return;
  }

  function extractPulumiInternalError(): Error | undefined {
    // Try to extract the error message that is thrown by the Pulumi community SDK.
    const errors: string[] = [];
    const errorGroupReg = /^\s+error: \d+ error occurred:(\n\s+\* .+)+$/gm;
    let errorGroupMatch: RegExpExecArray | null;
    while ((errorGroupMatch = errorGroupReg.exec(pulumiOutput)) !== null) {
      const errorDetailReg = /^\s+\* (.+)$/gm;
      let errorDetailMatch: RegExpExecArray | null;
      while ((errorDetailMatch = errorDetailReg.exec(errorGroupMatch[0])) !== null) {
        console.log(errorDetailMatch[1]);
        errors.push(errorDetailMatch[1]);
      }
    }

    if (errors.length > 0) {
      const errorMsg =
        `${errors.length} error occured while running the Pulumi command:\n` +
        errors.map((e) => `  * ${prettyErrorForPlatform(e)}`).join("\n");
      return new PulumiError(errorMsg, "");
    }
    return;
  }

  const extractedError = extractSDKError() || extractPulumiInternalError();
  if (extractedError) {
    return extractedError;
  } else {
    const errMsg = error.commandResult.err.shortMessage;
    return new PulumiError(errMsg, "");
  }
}

/**
 * Formats an error message based on the current platform.
 * @param error - The error message to format.
 * @returns The formatted error message.
 */
function prettyErrorForPlatform(error: string): string {
  function prettyAWSError(): string {
    const reg = /\b (.*?) \(arn:([^)]+)\).*StatusCode: (\d+), RequestID: ([\w-]+), (\w+): (.*)/g;
    const match = reg.exec(error);
    if (match && match.length === 7) {
      const [, resourceType, arn, statusCode, requestId, errorType, errorMsg] = match;
      return `${errorType}: ${errorMsg} An error occurred while operating the resource ${resourceType} (${arn}). StatusCode: ${statusCode}, RequestID: ${requestId}.`;
    }
    return error;
  }

  const prettyHanderMap: { [platform in PlatformType]?: () => string } = {
    [PlatformType.AWS]: prettyAWSError,
  };
  const platform = currentPlatformType();
  return prettyHanderMap[platform] ? prettyHanderMap[platform]!() : error;
}

/* The CommandError example:
{
  "commandResult": {
    "stdout": "",
    "stderr": "Command failed with exit code 255: pulumi up --yes --skip-preview --exec-kind auto.local --stack ali --non-interactive\nUpdating (ali):\n\n    pulumi:pulumi:Stack hello-pluto-ali running \n    pulumi:pulumi:Stack hello-pluto-ali running warning: Could not find entry point '/pluto/project/dist/index.js' specified in package.json; using '/pluto/project/.pluto/ali/generated/pulumi.js' instead\n    pulumi:pulumi:Stack hello-pluto-ali running error: Running program '/pluto/project/.pluto/ali/generated/pulumi.js' failed with an unhandled exception:\n    pulumi:pulumi:Stack hello-pluto-ali running (node:40896) PromiseRejectionHandledWarning: Promise rejection was handled asynchronously (rejection id: 6)\n    pulumi:pulumi:Stack hello-pluto-ali running (Use `node --trace-warnings ...` to show where the warning was created)\n    pulumi:pulumi:Stack hello-pluto-ali **failed** 1 error; 1 warning; 2 messages\nDiagnostics:\n  pulumi:pulumi:Stack (hello-pluto-ali):\n    warning: Could not find entry point '/pluto/project/dist/index.js' specified in package.json; using '/pluto/project/.pluto/ali/generated/pulumi.js' instead\n    error: Running program '/pluto/project/.pluto/ali/generated/pulumi.js' failed with an unhandled exception:\n    Error: The implementation class for the resource type '@plutolang/pluto.KVStore', intended for the 'Pulumi' provisioning engine on the 'AliCloud' platform, cannot be found.\n        at ImplClassMap.loadImplClassOrThrow (/pluto/packages/pluto-infra/src/utils/impl-class-map.ts:60:13)\n        at ImplClassMap.createInstanceOrThrow (/pluto/packages/pluto-infra/src/utils/impl-class-map.ts:81:34)\n        at Function.createInstance (/pluto/packages/pluto-infra/src/kvstore.ts:46:25)\n        at \u001b[90m/pluto/project/.pluto/ali/generated/\u001b[39mpulumi.js:45:62\n        at step \u001b[90m(/pluto/project/.pluto/ali/generated/\u001b[39mpulumi.js:33:23\u001b[90m)\u001b[39m\n        at Object.next \u001b[90m(/pluto/project/.pluto/ali/generated/\u001b[39mpulumi.js:14:53\u001b[90m)\u001b[39m\n        at fulfilled \u001b[90m(/pluto/project/.pluto/ali/generated/\u001b[39mpulumi.js:5:58\u001b[90m)\u001b[39m\n\n    (node:40896) PromiseRejectionHandledWarning: Promise rejection was handled asynchronously (rejection id: 6)\n    (Use `node --trace-warnings ...` to show where the warning was created)\n\nResources:\n    1 unchanged\n\nDuration: 1s\n",
    "code": -2,
    "err": {
      "shortMessage": "Command failed with exit code 255: pulumi up --yes --skip-preview --exec-kind auto.local --stack ali --non-interactive",
      "command": "pulumi up --yes --skip-preview --exec-kind auto.local --stack ali --non-interactive",
      "escapedCommand": "pulumi up --yes --skip-preview --exec-kind auto.local --stack ali --non-interactive",
      "exitCode": 255,
      "stdout": "Updating (ali):\n\n    pulumi:pulumi:Stack hello-pluto-ali running \n    pulumi:pulumi:Stack hello-pluto-ali running warning: Could not find entry point '/pluto/project/dist/index.js' specified in package.json; using '/pluto/project/.pluto/ali/generated/pulumi.js' instead\n    pulumi:pulumi:Stack hello-pluto-ali running error: Running program '/pluto/project/.pluto/ali/generated/pulumi.js' failed with an unhandled exception:\n    pulumi:pulumi:Stack hello-pluto-ali running (node:40896) PromiseRejectionHandledWarning: Promise rejection was handled asynchronously (rejection id: 6)\n    pulumi:pulumi:Stack hello-pluto-ali running (Use `node --trace-warnings ...` to show where the warning was created)\n    pulumi:pulumi:Stack hello-pluto-ali **failed** 1 error; 1 warning; 2 messages\nDiagnostics:\n  pulumi:pulumi:Stack (hello-pluto-ali):\n    warning: Could not find entry point '/pluto/project/dist/index.js' specified in package.json; using '/pluto/project/.pluto/ali/generated/pulumi.js' instead\n    error: Running program '/pluto/project/.pluto/ali/generated/pulumi.js' failed with an unhandled exception:\n    Error: The implementation class for the resource type '@plutolang/pluto.KVStore', intended for the 'Pulumi' provisioning engine on the 'AliCloud' platform, cannot be found.\n        at ImplClassMap.loadImplClassOrThrow (/pluto/packages/pluto-infra/src/utils/impl-class-map.ts:60:13)\n        at ImplClassMap.createInstanceOrThrow (/pluto/packages/pluto-infra/src/utils/impl-class-map.ts:81:34)\n        at Function.createInstance (/pluto/packages/pluto-infra/src/kvstore.ts:46:25)\n        at \u001b[90m/pluto/project/.pluto/ali/generated/\u001b[39mpulumi.js:45:62\n        at step \u001b[90m(/pluto/project/.pluto/ali/generated/\u001b[39mpulumi.js:33:23\u001b[90m)\u001b[39m\n        at Object.next \u001b[90m(/pluto/project/.pluto/ali/generated/\u001b[39mpulumi.js:14:53\u001b[90m)\u001b[39m\n        at fulfilled \u001b[90m(/pluto/project/.pluto/ali/generated/\u001b[39mpulumi.js:5:58\u001b[90m)\u001b[39m\n\n    (node:40896) PromiseRejectionHandledWarning: Promise rejection was handled asynchronously (rejection id: 6)\n    (Use `node --trace-warnings ...` to show where the warning was created)\n\nResources:\n    1 unchanged\n\nDuration: 1s\n",
      "stderr": "",
      "failed": true,
      "timedOut": false,
      "isCanceled": false,
      "killed": false
    }
  },
  "name": "CommandError"
}
*/

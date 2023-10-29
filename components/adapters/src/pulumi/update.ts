import path from "path";
import { LocalWorkspace } from "@pulumi/pulumi/automation";
import { ApplyArgs, ApplyResult } from "../adapter";
import { genPulumiConfigByRuntime } from "./utils";

export async function update(args: ApplyArgs): Promise<ApplyResult> {
  const pulumiFile = path.resolve("./", args.entrypoint);
  const pulumiWorkDir = path.dirname(pulumiFile);

  const pulumiStack = await LocalWorkspace.createOrSelectStack(
    {
      stackName: args.stack.name,
      workDir: pulumiWorkDir,
    },
    {
      workDir: pulumiWorkDir,
      envVars: {
        RUNTIME_TYPE: args.stack.runtime.type,
        ENGINE_TYPE: args.stack.engine,
        PULUMI_CONFIG_PASSPHRASE: "pluto",
      },
      projectSettings: {
        runtime: "nodejs",
        name: args.projName,
        main: pulumiFile,
        backend: { url: `file://~` },
      },
    }
  );

  const pulumiConfig = await genPulumiConfigByRuntime(args.stack);
  await pulumiStack.setAllConfig(pulumiConfig);

  process.env["RUNTIME_TYPE"] = args.stack.runtime.type;
  process.env["ENGINE_TYPE"] = args.stack.engine;
  process.env["WORK_DIR"] = pulumiWorkDir;
  // TODO: Generate a random string and save it to pluto.yml.
  process.env["PULUMI_CONFIG_PASSPHRASE"] = "pluto";

  try {
    const progressOut = process.env.DEBUG ? console.log : undefined;
    const upRes = await pulumiStack.up({ onOutput: progressOut });

    const outputs: { [key: string]: string } = {};
    for (const key in upRes.outputs) {
      outputs[key] = upRes.outputs[key].value;
    }
    return { outputs: outputs };
  } catch (e) {
    if (process.env.DEBUG) {
      console.error("------------- PULUMI UPDATE ERROR ---------------");
      console.error(e);
      console.error("------------- END PULUMI UPDATE ERROR -----------");
    }
    return { error: "Pulumi update error" };
  }
}

const pulumiProgram = (pulumiFile: string) => {
  return async () => {
    const outputs = await import(pulumiFile);
    return outputs;
  };
};

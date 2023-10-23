import path from "path";
import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";
import { ApplyArgs, ApplyResult } from "../adapter";
import { genPulumiConfigByRuntime } from "./utils";

export async function update(args: ApplyArgs): Promise<ApplyResult> {
  const pulumiFile = path.resolve("./", args.entrypoint);
  const pulumiArgs: InlineProgramArgs = {
    stackName: args.stack.name,
    projectName: args.projName,
    program: pulumiProgram(pulumiFile),
  };

  const pulumiStack = await LocalWorkspace.createOrSelectStack(pulumiArgs, {
    workDir: path.dirname(pulumiFile),
    envVars: {
      RUNTIME_TYPE: args.stack.runtime.type,
      ENGINE_TYPE: args.stack.engine,
    },
  });
  const pulumiConfig = await genPulumiConfigByRuntime(args.stack);
  await pulumiStack.setAllConfig(pulumiConfig);

  process.env["RUNTIME_TYPE"] = args.stack.runtime.type;
  process.env["ENGINE_TYPE"] = args.stack.engine;
  process.env["WORK_DIR"] = path.dirname(pulumiFile);

  try {
    const progressOut = process.env.DEBUG ? console.log : undefined;
    // await pulumiStack.cancel();
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

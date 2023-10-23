import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";
import { DestroyArgs, DestroyResult } from "../adapter";
import { genPulumiConfigByRuntime } from "./utils";

export async function destroy(args: DestroyArgs): Promise<DestroyResult> {
  const pulumiArgs: InlineProgramArgs = {
    stackName: args.stack.name,
    projectName: args.projName,
    program: async () => {},
  };

  const pulumiStack = await LocalWorkspace.createOrSelectStack(pulumiArgs);
  const pulumiConfig = await genPulumiConfigByRuntime(args.stack);
  await pulumiStack.setAllConfig(pulumiConfig);

  try {
    const progressOut = process.env.DEBUG ? console.log : undefined;
    await pulumiStack.refresh({ onOutput: progressOut });
    await pulumiStack.destroy({ onOutput: progressOut });
    await pulumiStack.workspace.removeStack(pulumiArgs.stackName);
    return {};
  } catch (e) {
    if (process.env.DEBUG) {
      console.error("------------- PULUMI DESTROY ERROR ---------------");
      console.error(e);
      console.error("------------- END PULUMI DESTROY ERROR -----------");
    }
    return { error: "Pulumi destroy error" };
  }
}

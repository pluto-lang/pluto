import path from "path";
import { InlineProgramArgs, LocalWorkspace, ConfigMap } from "@pulumi/pulumi/automation";
import { project, runtime } from "@pluto/base";
import { ApplyArgs, ApplyResult } from "../adapter";

export async function update(args: ApplyArgs): Promise<ApplyResult> {
  const pulumiFile = path.resolve("./", args.entrypoint);
  const pulumiArgs: InlineProgramArgs = {
    stackName: args.stack.name,
    projectName: args.projName,
    program: pulumiProgram(pulumiFile),
  };

  const pulumiStack = await LocalWorkspace.createOrSelectStack(pulumiArgs, {
    envVars: {
      RUNTIME_TYPE: args.stack.runtime.type,
      ENGINE_TYPE: args.stack.engine,
    },
  });
  const pulumiConfig = genPulumiConfigByRuntime(args.stack);
  await pulumiStack.setAllConfig(pulumiConfig);

  process.env["RUNTIME_TYPE"] = args.stack.runtime.type;
  process.env["ENGINE_TYPE"] = args.stack.engine;
  process.env["WORK_DIR"] = path.dirname(pulumiFile);

  try {
    const upRes = await pulumiStack.up();
    return { outputs: upRes.outputs };
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

function genPulumiConfigByRuntime(sta: project.Stack): ConfigMap {
  const genFnMapping: { [key in runtime.Type]?: (sta: project.Stack) => ConfigMap } = {
    [runtime.Type.AWS]: genPulumiConfigForAWS,
    [runtime.Type.K8s]: genPulumiConfigForK8s,
  };
  if (!(sta.runtime.type in genFnMapping)) {
    throw new Error("Not support this runtime.");
  }
  return genFnMapping[sta.runtime.type]!(sta);
}

function genPulumiConfigForAWS(sta: project.Stack): ConfigMap {
  const awsRt = sta.runtime as project.AwsRuntime;
  return {
    "aws:region": { value: awsRt.region },
    "aws:accessKey": { value: awsRt.accessKeyId },
    "aws:secretKey": { value: awsRt.secretAccessKey },
  };
}

function genPulumiConfigForK8s(sta: project.Stack): ConfigMap {
  const k8sRt = sta.runtime as project.K8sRuntime;
  return {
    "kubernetes:kubeconfig": { value: k8sRt.kubeConfigPath },
  };
}

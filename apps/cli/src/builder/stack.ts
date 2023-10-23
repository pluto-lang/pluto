import os from "os";
import { input, select } from "@inquirer/prompts";
import { engine, runtime, project } from "@pluto/base";

export interface CreateStackArgs {
  name?: string;
  rtType?: runtime.Type;
  engType?: engine.Type;
}

export async function createStack(args: CreateStackArgs): Promise<project.Stack> {
  args.name =
    args.name ??
    (await input({
      message: "Stack name",
      default: "dev",
    }));

  args.rtType =
    args.rtType ??
    (await select({
      message: "Select a platform",
      choices: [
        {
          name: "AWS",
          value: runtime.Type.AWS,
        },
        {
          name: "Kubernetes",
          value: runtime.Type.K8s,
        },
        {
          name: "GCP",
          value: runtime.Type.GCP,
          disabled: "(Coming soon)",
        },
        {
          name: "Custom",
          value: runtime.Type.Custom,
          disabled: "(Coming soon)",
        },
      ],
    }));

  const rt = await createRuntimeByType(args.rtType);

  args.engType =
    args.engType ??
    (await select({
      message: "Select an IaC engine",
      choices: [
        {
          name: "Pulumi",
          value: engine.Type.pulumi,
        },
        {
          name: "Terraform",
          value: engine.Type.terraform,
          disabled: "(Coming soon)",
        },
      ],
    }));

  return new project.Stack(args.name, rt, args.engType);
}

async function createRuntimeByType(rtType: runtime.Type): Promise<project.Runtime> {
  const rtBuilderMapping: { [key in runtime.Type]?: () => Promise<project.Runtime> } = {
    [runtime.Type.AWS]: createAwsRuntime,
    [runtime.Type.K8s]: createK8sRuntime,
  };

  if (!(rtType in rtBuilderMapping)) {
    throw new Error(`No such runtime type: ${rtType}`);
  }
  return await rtBuilderMapping[rtType]!();
}

async function createAwsRuntime(): Promise<project.AwsRuntime> {
  return new project.AwsRuntime();
}

async function createK8sRuntime(): Promise<project.K8sRuntime> {
  const kubeConfigPath = await input({
    message: "Kubeconfig path",
    default: `${os.homedir}/.kube/config`,
  });
  return new project.K8sRuntime(kubeConfigPath);
}

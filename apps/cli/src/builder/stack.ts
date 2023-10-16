import os from "os";
import { input, select } from "@inquirer/prompts";
import { engine, runtime } from "@pluto/base";
import * as model from "../model";

export interface CreateStackArgs {
  name?: string;
  rtType?: runtime.Type;
  engType?: engine.Type;
}

export async function createStack(args: CreateStackArgs): Promise<model.Stack> {
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

  return new model.Stack(args.name, rt, args.engType);
}

async function createRuntimeByType(rtType: runtime.Type): Promise<model.Runtime> {
  const rtBuilderMapping: { [key in runtime.Type]?: () => Promise<model.Runtime> } = {
    [runtime.Type.AWS]: createAwsRuntime,
    [runtime.Type.K8s]: createK8sRuntime,
  };

  if (!(rtType in rtBuilderMapping)) {
    throw new Error(`No such runtime type: ${rtType}`);
  }
  return await rtBuilderMapping[rtType]!();
}

async function createAwsRuntime(): Promise<model.AwsRuntime> {
  const region = await select({
    message: "Select a region",
    choices: [
      {
        name: "us-east-1",
        value: "us-east-1",
      },
      {
        name: "us-east-2",
        value: "us-east-2",
      },
    ],
  });
  const accessKeyId = await input({
    message: "Access key ID",
    validate: (val: string) => {
      return val.length > 0;
    },
  });
  const secretAccessKey = await input({
    message: "Secret access key",
    validate: (val: string) => {
      return val.length > 0;
    },
  });
  return new model.AwsRuntime(region, accessKeyId, secretAccessKey);
}

async function createK8sRuntime(): Promise<model.K8sRuntime> {
  const kubeConfigPath = await input({
    message: "Kubeconfig path",
    default: `${os.homedir}/.kube/config`,
  });
  return new model.K8sRuntime(kubeConfigPath);
}

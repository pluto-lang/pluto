import { input, select } from "@inquirer/prompts";
import { engine, runtime, config } from "@plutolang/base";

export interface CreateStackArgs {
  name?: string;
  rtType?: runtime.Type;
  engType?: engine.Type;
}

export async function createStack(args: CreateStackArgs): Promise<config.Stack> {
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
          name: "AliCloud",
          value: runtime.Type.AliCloud,
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

  return new config.Stack(args.name, args.rtType, args.engType);
}

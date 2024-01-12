import { input, select } from "@inquirer/prompts";
import { ProvisionType, PlatformType, config } from "@plutolang/base";

export interface CreateStackArgs {
  name?: string;
  platformType?: PlatformType;
  provisionType?: ProvisionType;
}

export async function createStack(args: CreateStackArgs): Promise<config.Stack> {
  args.name =
    args.name ??
    (await input({
      message: "Stack name",
      default: "dev",
    }));

  args.platformType =
    args.platformType ??
    (await select({
      message: "Select a platform",
      choices: [
        {
          name: "AWS",
          value: PlatformType.AWS,
        },
        {
          name: "Kubernetes",
          value: PlatformType.K8s,
        },
        {
          name: "AliCloud",
          value: PlatformType.AliCloud,
        },
        {
          name: "GCP",
          value: PlatformType.GCP,
          disabled: "(Coming soon)",
        },
        {
          name: "Custom",
          value: PlatformType.Custom,
          disabled: "(Coming soon)",
        },
      ],
    }));

  args.provisionType =
    args.provisionType ??
    (await select({
      message: "Select an provisioning engine",
      choices: [
        {
          name: "Pulumi",
          value: ProvisionType.Pulumi,
        },
        {
          name: "Terraform",
          value: ProvisionType.Terraform,
          disabled: "(Coming soon)",
        },
      ],
    }));

  return new config.Stack(args.name, args.platformType, args.provisionType);
}

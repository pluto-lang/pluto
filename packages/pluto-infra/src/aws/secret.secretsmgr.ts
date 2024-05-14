import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as utils from "@plutolang/base/utils";
import { IResourceInfra } from "@plutolang/base";
import { Secret as SecretProto } from "@plutolang/pluto";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";
import { Permission } from "./permission";

enum SecretOps {
  "GET" = "get",
}

export class Secret extends pulumi.ComponentResource implements IResourceInfra {
  public readonly id: string;

  private readonly secret: aws.secretsmanager.Secret;

  constructor(name: string, value: string) {
    if (value === undefined) {
      throw new Error(`Secret value is required for secret: ${name}`);
    }

    super("pluto:secret:aws/Secret", name);
    this.id = utils.genResourceId(SecretProto.fqn, name);
    const resName = genAwsResourceName(this.id);

    this.secret = new aws.secretsmanager.Secret(
      resName,
      {
        name: resName,
        description: `Secret for ${name}, project: ${utils.currentProjectName()}, stack: ${utils.currentStackName()}`,
        recoveryWindowInDays: 0,
      },
      { parent: this }
    );

    new aws.secretsmanager.SecretVersion(
      resName,
      {
        secretId: this.secret.arn,
        secretString: value,
      },
      { parent: this }
    );
  }

  public grantPermission(operation: string): Permission {
    const actions = [];
    switch (operation) {
      case SecretOps.GET:
        actions.push("secretsmanager:GetSecretValue");
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      effect: "Allow",
      actions: actions,
      resources: [this.secret.arn],
    };
  }

  public postProcess(): void {}
}

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { ISageMakerInfra, SageMakerOptions, SageMaker as SageMakerProto } from "@plutolang/pluto";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";
import { currentAwsRegion } from "./utils";

const defaultInstanceType = "ml.m5.large";

export enum SageMakerOps {
  INVOKE = "invoke",
}

export class SageMaker extends pulumi.ComponentResource implements IResourceInfra, ISageMakerInfra {
  public readonly id: string;

  public readonly endpointName: string;

  constructor(name: string, imageUri: string, options?: SageMakerOptions) {
    super("pluto:sagemaker:aws/SageMaker", name, options);
    this.id = genResourceId(SageMakerProto.fqn, name);

    const role = this.createIAM();

    const sagemakerModel = new aws.sagemaker.Model(
      genAwsResourceName(this.id, "model"),
      {
        name: genAwsResourceName(this.id, "model"),
        executionRoleArn: role.arn,
        primaryContainer: {
          image: imageUri,
          environment: options?.envs,
        },
      },
      { parent: this }
    );

    const instanceType = options?.instanceType ?? defaultInstanceType;
    // Define the SageMaker endpoint configuration
    const endpointConfig = new aws.sagemaker.EndpointConfiguration(
      genAwsResourceName(this.id, "endpoint-config"),
      {
        productionVariants: [
          {
            instanceType: instanceType,
            modelName: sagemakerModel.name,
            initialInstanceCount: 1,
            variantName: "AllTraffic",
          },
        ],
      },
      { parent: this }
    );

    // Define the SageMaker endpoint
    this.endpointName = genAwsResourceName(this.id, "endpoint");
    new aws.sagemaker.Endpoint(
      this.endpointName,
      {
        name: this.endpointName,
        endpointConfigName: endpointConfig.name,
      },
      { parent: this }
    );
    console.log(
      "Creating SageMaker endpoint will take a few minutes, please wait for the endpoint to be ready."
    );
  }

  public endpointUrl(): string {
    return pulumi.interpolate`https://runtime.sagemaker.${currentAwsRegion()}.amazonaws.com/endpoints/${
      this.endpointName
    }/invocations` as any;
  }

  private createIAM() {
    const sageMakerExecutionRole = new aws.iam.Role(
      genAwsResourceName(this.id, "role"),
      {
        assumeRolePolicy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Action: "sts:AssumeRole",
              Effect: "Allow",
              Principal: {
                Service: "sagemaker.amazonaws.com",
              },
            },
          ],
        }),
      },
      { parent: this }
    );

    new aws.iam.RolePolicyAttachment(
      genAwsResourceName(this.id, "policy-attachment"),
      {
        role: sageMakerExecutionRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess", // Replace with the necessary policy ARN
      },
      { parent: this }
    );

    return sageMakerExecutionRole;
  }

  public grantPermission(operation: string) {
    const actions = [];
    switch (operation) {
      case SageMakerOps.INVOKE:
        actions.push("sagemaker:InvokeEndpoint");
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      effect: "Allow",
      actions: actions,
      resources: [this.fuzzyArn()],
    };
  }

  public postProcess(): void {}

  private fuzzyArn() {
    return `arn:aws:sagemaker:${currentAwsRegion()}:*:endpoint/${
      this.endpointName
    }`.toLocaleLowerCase();
  }
}

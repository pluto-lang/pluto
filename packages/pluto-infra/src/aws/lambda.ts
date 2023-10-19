import fs from "fs";
import path from "path";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import { ResourceInfra } from "@pluto/base";
import { Role } from "@pulumi/aws/iam";
import { Function } from "@pulumi/aws/lambda";

export enum Ops {
  WATCH_LOG = "WATCH_LOG",
}

if (!process.env["WORK_DIR"]) {
  throw new Error("Missing environment variable WORK_DIR");
}
const WORK_DIR = process.env["WORK_DIR"]!;

export class Lambda extends pulumi.ComponentResource implements ResourceInfra {
  readonly name: string;

  lambda: Function;
  iam: Role;
  statements: aws.types.input.iam.GetPolicyDocumentStatement[];

  constructor(name: string, args?: {}, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:lambda:aws/Lambda", name, args, opts);
    this.name = name;
    this.statements = [];

    const role = aws.iam.getPolicyDocument(
      {
        statements: [
          {
            effect: "Allow",
            principals: [
              {
                type: "Service",
                identifiers: ["lambda.amazonaws.com"],
              },
            ],
            actions: ["sts:AssumeRole"],
          },
        ],
      },
      { parent: this }
    );

    const iam = new aws.iam.Role(`${name}-iam`, {
      assumeRolePolicy: role.then((assumeRole) => assumeRole.json),
    });

    const repo = new awsx.ecr.Repository(`${name}-repo`, {
      forceDelete: true,
    });

    const dockerfileBody = `FROM public.ecr.aws/lambda/nodejs:16

WORKDIR /app

COPY dist/aws-runtime.js /app/
COPY dist/.dapr /app/.dapr
COPY dapr /app/.dapr/components
COPY package.json /app/
COPY dist/${name}.js /app/

RUN npm install --omit=dev

COPY dist/pluto /app/node_modules/@pluto/pluto

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "/app/aws-runtime.handler" ]
`;
    const filename = `${name}.Dockerfile`;
    fs.writeFileSync(path.join(WORK_DIR, filename), dockerfileBody);

    const image = new awsx.ecr.Image(
      `${name}-image`,
      {
        repositoryUrl: repo.url,
        path: WORK_DIR,
        extraOptions: ["--platform", "linux/amd64"],
        dockerfile: filename,
      },
      { parent: this }
    );

    const fn = new aws.lambda.Function(
      `${name}-fn`,
      {
        packageType: "Image",
        imageUri: image.imageUri, //TODO
        // imageUri: '811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr:latest',
        role: iam.arn,
        environment: {
          variables: {
            CIR_DIR: `/app/${name}.js`,
            RUNTIME_TYPE: "AWS",
          },
        },
        timeout: 120,
      },
      { parent: this }
    );

    this.lambda = fn;
    this.iam = iam;
    this.getPermission(Ops.WATCH_LOG, this);

    this.registerOutputs();
  }

  public getPermission(op: string, resource: ResourceInfra) {
    const WATCH_LOG_ARN = "arn:aws:logs:*:*:*";

    if (resource !== this) {
      const stat: aws.types.input.iam.GetPolicyDocumentStatement = resource.getPermission(op);
      this.statements.push(stat);
    } else {
      switch (op.toUpperCase()) {
        case Ops.WATCH_LOG:
          this.statements.push({
            effect: "Allow",
            actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
            resources: [WATCH_LOG_ARN],
          });
          break;
        default:
          throw new Error(`Unknown op: ${op}`);
      }
    }
  }

  public postProcess(): void {
    const policyDocument = aws.iam.getPolicyDocument({
      statements: this.statements,
    });
    const policy = new aws.iam.Policy(`${this.name}-iam-policy`, {
      path: "/",
      description: "IAM policy",
      policy: policyDocument.then((policyDocument) => policyDocument.json),
    });
    new aws.iam.RolePolicyAttachment(`${this.name}-iam-attachment`, {
      role: this.iam.name,
      policyArn: policy.arn,
    });
  }
}

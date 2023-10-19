import fs from "fs";
import path from "path";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import { ResourceInfra } from "@pluto/base";
import { Role } from "@pulumi/aws/iam";
import { Function } from "@pulumi/aws/lambda";
import { DynamoDbOps } from "./dynamoKVStore";

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

  constructor(name: string, args?: {}, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:lambda:aws/Lambda", name, args, opts);
    this.name = name;

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
    this.grantPermission(Ops.WATCH_LOG, "arn:aws:logs:*:*:*");

    this.registerOutputs();
  }

  grantPermission(op: string, resourceArn: string) {
    switch (op.toUpperCase()) {
      case Ops.WATCH_LOG:
        // const logGroup = new aws.cloudwatch.LogGroup(`${this.name}-logGroup`, { retentionInDays: 14 });
        const lambdaLoggingPolicyDocument = aws.iam.getPolicyDocument({
          statements: [
            {
              effect: "Allow",
              actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
              resources: [resourceArn],
            },
          ],
        });
        const lambdaLoggingPolicy = new aws.iam.Policy(`${this.name}-logPolicy`, {
          path: "/",
          description: "IAM policy for logging from a lambda",
          policy: lambdaLoggingPolicyDocument.then(
            (lambdaLoggingPolicyDocument) => lambdaLoggingPolicyDocument.json
          ),
        });
        new aws.iam.RolePolicyAttachment(`${this.name}-logAttach`, {
          role: this.iam.name,
          policyArn: lambdaLoggingPolicy.arn,
        });
        break;

      case DynamoDbOps.GET:
        const dbGet = aws.iam.getPolicyDocument({
          statements: [
            {
              effect: "Allow",
              actions: ["dynamodb:GetItem"],
              resources: [resourceArn],
            },
          ],
        });
        const dbGetPolicy = new aws.iam.Policy(`${this.name}-dbGetPolicy`, {
          path: "/",
          description: "IAM policy for getting dynamodb item from a lambda",
          policy: dbGet.then((dbGet) => dbGet.json),
        });
        new aws.iam.RolePolicyAttachment(`${this.name}-dbGetAttach`, {
          role: this.iam.name,
          policyArn: dbGetPolicy.arn,
        });
        break;

      case DynamoDbOps.SET:
        const dbSet = aws.iam.getPolicyDocument({
          statements: [
            {
              effect: "Allow",
              actions: ["dynamodb:*"],
              resources: [resourceArn],
            },
          ],
        });
        const dbSetPolicy = new aws.iam.Policy(`${this.name}-dbSetPolicy`, {
          path: "/",
          description: "IAM policy for setting dynamodb item from a lambda",
          policy: dbSet.then((dbSet) => dbSet.json),
        });
        new aws.iam.RolePolicyAttachment(`${this.name}-dbSetAttach`, {
          role: this.iam.name,
          policyArn: dbSetPolicy.arn,
        });
        break;

      case DynamoDbOps.PUSH:
        const snsPush = aws.iam.getPolicyDocument({
          statements: [
            {
              effect: "Allow",
              actions: ["sns:*"],
              resources: [resourceArn],
            },
          ],
        });
        const snsPushPolicy = new aws.iam.Policy(`${this.name}-snsPushPolicy`, {
          path: "/",
          description: "IAM policy for setting dynamodb item from a lambda",
          policy: snsPush.then((snsPush) => snsPush.json),
        });
        new aws.iam.RolePolicyAttachment(`${this.name}-snsPushAttach`, {
          role: this.iam.name,
          policyArn: snsPushPolicy.arn,
        });
        break;
    }
  }

  public postProcess(): void {}
}

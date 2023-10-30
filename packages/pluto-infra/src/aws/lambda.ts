import fs from "fs";
import path from "path";
import * as aws from "@pulumi/aws";
import * as archive from "@pulumi/archive";
import * as pulumi from "@pulumi/pulumi";
import { ResourceInfra } from "@plutolang/base";
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

  // eslint-disable-next-line
  lambda: Function;
  iam: Role;
  statements: aws.types.input.iam.GetPolicyDocumentStatement[];

  constructor(name: string, args?: object, opts?: pulumi.ComponentResourceOptions) {
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

    this.iam = new aws.iam.Role(`${name}-iam`, {
      assumeRolePolicy: role.then((assumeRole) => assumeRole.json),
    });

    // copy the compute module and runtime to a directory
    const moduleFilename = `${this.name}.js`;
    const runtimeFilename = "runtime.js";
    const modulePath = path.join(WORK_DIR, moduleFilename);
    const runtimePath = path.join(__dirname, runtimeFilename);
    const sourceDir = path.join(WORK_DIR, `${this.name}-payload`);
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.copyFileSync(modulePath, path.join(sourceDir, moduleFilename));
    fs.copyFileSync(runtimePath, path.join(sourceDir, runtimeFilename));

    // build the zip file
    const outputPath = path.join(WORK_DIR, `${this.name}-payload.zip`);
    archive.getFile(
      {
        type: "zip",
        outputPath: outputPath,
        sourceDir: sourceDir,
      },
      { parent: this }
    );

    this.lambda = new aws.lambda.Function(
      `${this.name}-lambda`,
      {
        code: new pulumi.asset.FileArchive(outputPath),
        role: this.iam.arn,
        handler: "runtime.default",
        runtime: "nodejs18.x",
        environment: {
          variables: {
            COMPUTE_MODULE: moduleFilename,
            RUNTIME_TYPE: "AWS",
          },
        },
        timeout: 30,
      },
      { parent: this }
    );

    this.getPermission(Ops.WATCH_LOG, this);
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

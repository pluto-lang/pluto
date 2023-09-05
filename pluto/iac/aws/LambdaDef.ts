//link:Fn
import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"
import { DynamoDbOps } from "./DynamoDBDef";
import { Role } from "@pulumi/aws/iam";
import { Function } from "@pulumi/aws/lambda";

export enum Ops {
    WATCH_LOG = "WATCH_LOG"
}

export class LambdaDef extends pulumi.ComponentResource {
    name: string;
    lambda: Function;
    iam: Role;

    constructor(name: string, opts?: {}) {
        super("pluto:aws:Lambda", name, opts);
        this.name = name;

        const role = aws.iam.getPolicyDocument({
            statements: [{
                effect: "Allow",
                principals: [{
                    type: "Service",
                    identifiers: ["lambda.amazonaws.com"],
                }],
                actions: ["sts:AssumeRole"],
            }],
        });

        const iam = new aws.iam.Role(`${name}-iam`, { assumeRolePolicy: role.then(assumeRole => assumeRole.json) });

        const fn = new aws.lambda.Function(`${name}-fn`, {
            packageType: "Image",
            imageUri: "811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr:latest", //TODO
            role: iam.arn,
            environment: {
                variables: {
                    foo: "bar",
                },
            },
            timeout: 120,
        });

        this.lambda = fn;
        this.iam = iam;
        this.grantPermission(Ops.WATCH_LOG, "");

        this.registerOutputs();
    }

    grantPermission(op: string, resourceArn: string) {
        switch (op) {
            case Ops.WATCH_LOG:
                const logGroup = new aws.cloudwatch.LogGroup(`${this.name}-logGroup`, { retentionInDays: 14 });
                const lambdaLoggingPolicyDocument = aws.iam.getPolicyDocument({
                    statements: [{
                        effect: "Allow",
                        actions: [
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                        ],
                        resources: ["arn:aws:logs:*:*:*"],
                    }],
                });
                const lambdaLoggingPolicy = new aws.iam.Policy(`${this.name}-logPolicy`, {
                    path: "/",
                    description: "IAM policy for logging from a lambda",
                    policy: lambdaLoggingPolicyDocument.then(lambdaLoggingPolicyDocument => lambdaLoggingPolicyDocument.json),
                });
                const logAttach = new aws.iam.RolePolicyAttachment(`${this.name}-logAttach`, {
                    role: this.iam.name,
                    policyArn: lambdaLoggingPolicy.arn,
                });
                break;

            case DynamoDbOps.GET:
                const dbGet = aws.iam.getPolicyDocument({
                    statements: [{
                        effect: "Allow",
                        actions: [
                            "dynamodb:GetItem",
                            "dynamodb:BatchGetItem",
                        ],
                        resources: [resourceArn],
                    }],
                });
                const dbGetPolicy = new aws.iam.Policy(`${this.name}-dbGetPolicy`, {
                    path: "/",
                    description: "IAM policy for getting dynamodb item from a lambda",
                    policy: dbGet.then(dbGet => dbGet.json),
                });
                const dbGetAttach = new aws.iam.RolePolicyAttachment(`${this.name}-dbGetAttach`, {
                    role: this.iam.name,
                    policyArn: dbGetPolicy.arn,
                });
                break;

            case DynamoDbOps.SET:
                const dbSet = aws.iam.getPolicyDocument({
                    statements: [{
                        effect: "Allow",
                        actions: [
                            "dynamodb:GetItem",
                            "dynamodb:BatchGetItem",
                        ],
                        resources: [resourceArn],
                    }],
                });
                const dbSetPolicy = new aws.iam.Policy(`${this.name}-dbSetPolicy`, {
                    path: "/",
                    description: "IAM policy for setting dynamodb item from a lambda",
                    policy: dbSet.then(dbSet => dbSet.json),
                });
                const dbSetAttach = new aws.iam.RolePolicyAttachment(`${this.name}-dbSetAttach`, {
                    role: this.iam.name,
                    policyArn: dbSetPolicy.arn,
                });
                break;
        }
    }
}
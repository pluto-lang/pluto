//link:Queue
import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"
import { LambdaDef } from "./LambdaDef";
import { assert } from "console";

export class SNSDef extends pulumi.ComponentResource {
    name: string;

    topic: aws.sns.Topic;

    constructor(name: string, opts?: {}) {
        super("pluto:aws:SNS", name, opts);
        this.name = name;

        this.topic = new aws.sns.Topic(name, {
            name: name,
            tags: {
                "dapr-topic-name": name
            }
        })

        this.registerOutputs();
    }

    addHandler(op: string, fn: LambdaDef, params: { [key: string]: any }) {
        assert(["SUBSCRIBE"].indexOf(op.toUpperCase()) != -1, `${op} method not allowed`);
        const resourceNamePrefix = `${this.name}-${fn.name}`

        // create topic subscription
        new aws.sns.TopicSubscription(`${resourceNamePrefix}-subscription`, {
            endpoint: fn.lambda.arn,
            protocol: 'lambda',
            topic: this.topic.arn,
        })

        // create sns trigger
        new aws.lambda.Permission(`${resourceNamePrefix}-httpTrigger`, {
            action: "lambda:InvokeFunction",
            function: fn.lambda.name,
            principal: "sns.amazonaws.com",
            sourceArn: this.topic.arn
        })
    }

    postProcess() { }

    fuzzyArn() {
        return `arn:aws:sns:*:*:${this.name}`;
    }
}
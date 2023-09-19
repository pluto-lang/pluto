import * as aws from "@pulumi/aws"
import { LambdaDef } from "./LambdaDef";
import { assert } from "console";
import { BaasResource, FaasResource, QueueDef, QueueOptions } from "@pluto/pluto";

export class SNSDef extends BaasResource implements QueueDef {
    topic: aws.sns.Topic;

    constructor(name: string, opts?: QueueOptions) {
        super("pluto:aws:SNS", name, opts);

        this.topic = new aws.sns.Topic(name, {
            name: name,
            tags: {
                "dapr-topic-name": name
            }
        })

        this.registerOutputs();
    }

    public subscribe(fn: FaasResource): void {
        assert(fn instanceof LambdaDef, 'Fn is not a subclass of LambdaDef.');
        const lambda = fn as LambdaDef

        const resourceNamePrefix = `${this.name}-${lambda.name}`

        // create topic subscription
        new aws.sns.TopicSubscription(`${resourceNamePrefix}-subscription`, {
            endpoint: lambda.lambda.arn,
            protocol: 'lambda',
            topic: this.topic.arn,
        })

        // create sns trigger
        new aws.lambda.Permission(`${resourceNamePrefix}-httpTrigger`, {
            action: "lambda:InvokeFunction",
            function: lambda.lambda.name,
            principal: "sns.amazonaws.com",
            sourceArn: this.topic.arn
        })
    }

    postProcess() { }

    fuzzyArn() {
        return `arn:aws:sns:*:*:${this.name}`;
    }
}
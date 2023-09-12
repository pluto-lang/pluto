//link:State
import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"
import { State } from "../../state2";

export enum DynamoDbOps {
    GET = "GET",
    SET = "SET",
    PUSH = "PUSH"
}

export class DynamoDBDef extends State {
    arn: pulumi.Output<string>;

    constructor(name: string, opts?: {}) {
        super("pluto:aws:DynamoDB", name, opts);

        const db = new aws.dynamodb.Table(name, {
            name: name,
            attributes: [
                {
                    name: "Id",
                    type: "S",
                },
            ],
            hashKey: "Id",
            readCapacity: 10,
            writeCapacity: 10,
        })

        this.arn = db.arn;

        this.registerOutputs({
            DynamoDbName: db.name,
        });
    }

    fuzzyArn() {
        return `arn:aws:dynamodb:*:*:table/${this.name}`;
    }
}
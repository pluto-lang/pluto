import { IState } from "../state";
import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"

export class AwsState extends pulumi.ComponentResource implements IState {
    outputName;
    arn;

    constructor(name:string, opts: {}) {
        super(name, "", opts);

        const db = new aws.dynamodb.Table(name, {
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

        // Create a property for the bucket name that was created
        this.outputName = db.name,
        this.arn = db.arn;

        // Register that we are done constructing the component
        this.registerOutputs();
    }

    public async get(key: string) {
        // global.curHandler.role.grant(this.arn, ["dynamodb:GetItem"]);
        return "";
    }

    public async set(key: string, value: string) {

    }
}
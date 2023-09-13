import { ComponentResource } from "@pulumi/pulumi";

export abstract class FaasResource extends ComponentResource {
    name: string;

    constructor(type: string, name: string, opts: any) {
        super(type, name, opts);
        this.name = name;
    }

    public static buildClient(name: string): any {
        throw new Error("Method not implemented.");
    };

    public abstract grantPermission(op: string, resourceArn: string): void;
}
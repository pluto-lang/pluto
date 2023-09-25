import { ComponentResource, ComponentResourceOptions } from "@pulumi/pulumi";

export abstract class FaasResource extends ComponentResource {
    name: string;

    constructor(type: string, name: string, args: any, opts?: ComponentResourceOptions) {
        super(type, name, args, opts);
        this.name = name;
    }

    public abstract grantPermission(op: string, resourceArn: string): void;
}
import { ComponentResource, ComponentResourceOptions, ResourceOptions } from "@pulumi/pulumi";

export abstract class BaasResource extends ComponentResource {
    name: string = "default";

    constructor(type: string, name: string, args?: any, opts?: ComponentResourceOptions) {
        super(type, name, args, opts)
        this.name = name;
    }

    public fuzzyArn(): string {
        throw new Error('Method not implemented.')
    };

    public postProcess() { };
}
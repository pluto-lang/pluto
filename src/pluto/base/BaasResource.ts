import { ComponentResource } from "@pulumi/pulumi";

export abstract class BaasResource extends ComponentResource {
    name: string = "default";

    constructor(type: string, name: string, opts?: any) {
        super(type, name, opts)
        this.name = name;
    }

    public fuzzyArn(): string {
        throw new Error('Method not implemented.')
    };

    public postProcess() { };
}
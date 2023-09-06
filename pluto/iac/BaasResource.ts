import { ComponentResource } from "@pulumi/pulumi";
import { FaasResource } from "./FaasResource";

export abstract class BaasResource extends ComponentResource {
    name: string = "default";

    public abstract addHandler(op: string, fn: FaasResource, params?: { [key: string]: any }): void;

    public postProcess() {};
}
import { BaasResource } from "./iac/BaasResource";
import { FaasResource } from "./iac/FaasResource";

export interface RouterDef {
    get(path: string, fn: FaasResource): void;
}

export abstract class Router extends BaasResource implements RouterDef {
    public abstract get(path: string, fn: FaasResource): void;

    public static buildClient(name: string): any {
        return null;
    }
}
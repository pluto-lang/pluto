import { BaasResource } from "./iac/BaasResource";
import { FaasResource } from "./iac/FaasResource";
import { Request } from "./request";

type RequestHandler = (req: Request) => Promise<string>;

export interface RouterDef {
    get(path: string, fn: FaasResource): void;
}

// TODO: abstract class
export class Router extends BaasResource implements RouterDef {
    constructor(name: string, type?: string, opts?: {}) {
        super(type!, name, opts);
    }

    public get(path: string, fn: RequestHandler | FaasResource): void {
        throw new Error('use a subclass instead.')
    }

    public static buildClient(name: string): any {
        return null;
    }
}
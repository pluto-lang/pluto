import { FaasResource } from "./base/FaasResource";
import { Request } from "./request";

type RequestHandler = (req: Request) => Promise<string>;

export interface RouterDef {
    get(path: string, fn: FaasResource | RequestHandler): void;
}

export interface RouterOptions { }

// TODO: abstract class
export class Router {
    constructor(name: string, opts?: RouterOptions) { }
}

export interface Router extends RouterDef { }
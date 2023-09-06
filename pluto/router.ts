import { API } from "./api";
import { Request } from "./request";

/**
 * @infra faas
 */
type HttpHandler = (req: Request) => Promise<string>;

/**
 * @infra baas
 */
export class Router implements API {
    private name: string = "default";
    /**
     * @infra baas
     */
    public get(path: string, handler: HttpHandler) {
        routes[path] = handler;
    }
}

const routes: { [key: string]: HttpHandler } = {}

export async function processRequest(req: Request): Promise<string> {
    console.log('receive a http request: ', req);

    let result = "No Handler";
    if (req.path in routes) {
        result = await (routes[req.path](req));
    }
    return result;
}

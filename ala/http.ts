export class Request {
    path: string = "";
    query: { [key: string]: string } = {};

    static fromAws(event: any) {
        const req = new Request();
        req.path = event.rawPath;

        const pairs = event.rawQueryString.split('&');
        pairs.forEach((pair: any) => {
            const parts = pair.split('=');
            req.query[parts[0]] = parts[1];
        })

        return req;
    }
}



type HttpHandler = (req: Request) => Promise<string>;
const routers: Router[] = [];

export class Router {
    routes: { [key: string]: HttpHandler } = {}

    public get(path: string, handler: HttpHandler) {
        this.routes[path] = handler;
    }
}




export function start(router: Router) {
    routers.push(router);
}

export async function processRequest(req: Request): Promise<string> {
    console.log('receive a http request: ', req);

    let result = "No Handler";
    for (let router of routers) {
        if (req.path in router.routes) {
            result = await (router.routes[req.path](req));
        }
    }
    return result;
}
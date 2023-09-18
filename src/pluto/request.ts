export class Request {
    path: string = "";
    query: { [key: string]: string } = {};

    static fromAws(event: any) {
        const req = new Request();
        if ('rawPath' in event) {  // Directly access the lambda url
            req.path = event.rawPath;
            const pairs = event.rawQueryString.split('&');
            pairs.forEach((pair: any) => {
                const parts = pair.split('=');
                req.query[parts[0]] = parts[1];
            })
        
        } else {  // Access through the ApiGateway
            req.path = event.resource;
            if (event.queryStringParameters != null) {
                req.query = event.queryStringParameters;
            }
        }
        return req;
    }
}
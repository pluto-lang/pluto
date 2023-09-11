
/** CIR */

import { Request, Queue, Stack } from "@pluto";

export default function handlerBuilder (queue: any) {
    const handler = async (req: Request): Promise<string> => {
        const name = req.query['name'] ?? "Anonym";
        const message = `${name} access at ${Date.now()}`
        await queue.push({ name, message });
        return `Publish a message: ${message}`;
    }
    return handler
}



/** outside code */
const stack = Stack.new("aws");

const queue = stack.newClient("Queue", "access");
const handler = handlerBuilder(queue);

exports.handler = async (event: any) => {
    console.log(event);
    
    const req = Request.fromAws(event);
    const body = handler(req);

    const response = {
        statusCode: 200,
        body: JSON.stringify(body),
    };
    return response;
};
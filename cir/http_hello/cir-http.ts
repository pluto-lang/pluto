import { Router, State, Request, Queue } from "@pluto";

const queue = new Queue("access");

const router = new Router();

router.get("/hello", async function helloHandler(req: Request): Promise<string> {
    const name = req.query['name'] ?? "Anonym";
    const message = `${name} access at ${Date.now()}`
    await queue.push({ name, message });
    return `Publish a message: ${message}`;
})
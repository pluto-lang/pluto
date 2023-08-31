import { Request, Router, start } from '../../ala/http';
import { Queue } from '../../ala/queue';
import State from '../../ala/state';

const state = new State("statestore");
const queue = new Queue("access");

const router = new Router();

router.get("/hello", async function helloHandler(req: Request): Promise<string> {
    const name = req.query['name'] ?? "Anonym";
    const message = `${name} access at ${Date.now()}`
    await queue.push({ name, message });
    return `Publish a message: ${message}`;
})

router.get("/store", async function storeHandler(req: Request): Promise<string> {
    const name = req.query['name'] ?? "Anonym";
    const message = await state.get(name);
    return `Fetch ${name} access message: ${message}.`;
})

start(router);
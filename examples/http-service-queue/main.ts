import { Event, Request, Router, Queue, State } from '@pluto';

const state = new State("statestore");
const queue = new Queue("access");
const router = new Router("hello");

router.get("/hello", async (req: Request): Promise<string> => {
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

queue.subscribe(async (event: Event): Promise<string> => {
    const data = event.data;
    await state.set(data['name'], data['message']);
    return 'receive an event';
})
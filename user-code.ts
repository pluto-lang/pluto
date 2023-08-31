import { Event } from './ala/event';
import { Request, Router, start } from './ala/http';
import { Queue } from './ala/queue';
import { emit } from './ala/faas';
import State from './ala/state';

const state = new State("statestore");
const queue = new Queue("access");
const router = new Router();

let counter = 0;

function count(name: string): Number {
    counter ++;
    return name.length;
}

router.get("/hello", async function helloHandler(req: Request): Promise<string> {
    const name = req.query['name'] ?? "Anonym";
    const message = `${name} access at ${Date.now()}`
    await queue.push({ name, message });
    await emit(count, name);
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

start(router);
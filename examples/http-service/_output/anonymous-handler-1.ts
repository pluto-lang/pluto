import { Request, Router, State } from '@pluto';

const state = new State("statestore");
const router = new Router();

const defaultName = "Anonym";

router.get("/hello", async (req: Request): Promise<string> => {
    const name = req.query['name'] ?? defaultName;
    const message = `${name} access at ${Date.now()}`
    await state.set(name, message);
    return `Save a message: ${message}`;
})

import { Request, Router, start } from '../../ala/http';
import State from '../../ala/state';

const state = new State("statestore");

const router = new Router();

router.get("/store", async function storeHandler(req: Request): Promise<string> {
    const name = req.query['name'] ?? "Anonym";
    const message = await state.get(name);
    return `Fetch ${name} access message: ${message}.`;
})

start(router);
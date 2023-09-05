import { Request, Router, State } from '@pluto';

const state = new State("statestore");
const router = new Router();

const defaultName = "Anonym";

router.get("/store", async (req: Request): Promise<string> => {
    const name = req.query['name'] ?? defaultName;
    const message = await state.get(name);
    return `Get ${name} access message: ${message}.`;
})
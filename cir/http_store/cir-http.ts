import { Router, State, Request } from "@pluto";

const state = new State("statestore");

const router = new Router();

router.get("/store", async (req: Request): Promise<string> => {
    const name = req.query['name'] ?? "Anonym";
    const message = await state.get(name);
    return `Fetch ${name} access message: ${message}.`;
})
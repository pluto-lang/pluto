import { DaprClient } from "@dapr/dapr";
import getClient from "./client";
import State from "./state";

export class Variable {
    name: string = "";
    type: any;
    client: DaprClient;

    constructor(name: string, type: any) {
        this.name = name;
        this.type = type;
        this.client = getClient();
    }

    public async add(delta: any) {
        let value = await getValue(this.name);

        switch (this.type) {
            case Number.prototype:
                value = (value as number) + (delta as number);
                break;
            default:
                throw new Error('not support')
        }
        
        await saveValue(this.name, value);
        return value;
    }
}


const state = new State("remote_var");

async function getValue(name: string) {
    return JSON.parse((await state.get(name)).toString());
}

async function saveValue(name: string, value: any) {
    await state.set(name, JSON.stringify(value));
}
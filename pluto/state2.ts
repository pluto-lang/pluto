import { DaprClient } from "@dapr/dapr";
import { BaasResource } from "./iac/BaasResource";
import { FaasResource } from "./iac/FaasResource";
import getClient from "./client";

export interface StateDef { }

export interface StateClient {
    get(key: string): Promise<string>;
    set(key: string, val: string): Promise<void>;
}

export abstract class State extends BaasResource implements StateDef {
    public static buildClient(name: string): StateClient {
        const rtType = process.env['RUNTIME_TYPE'];
        switch (rtType?.toUpperCase()) {
            case 'AWS':
                return new DaprStateClient(name);
            default:
                throw new Error(`not support this runtime '${rtType}'`)
        }
    }
}

class DaprStateClient implements StateClient {
    name: string;
    client: DaprClient;

    constructor(name: string) {
        this.name = name;
        this.client = getClient();
    }

    public async get(key: string): Promise<string> {
        const value = await this.client.state.get(this.name, key);
        return value.toString();
    }

    public async set(key: string, value: string): Promise<void> {
        await this.client.state.save(this.name, [{ key, value }]);
    }
}
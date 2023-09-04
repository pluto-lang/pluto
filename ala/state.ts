import { DaprClient } from "@dapr/dapr";
import getClient from "./client";

export interface IState {
    get(key: string): Promise<string>;
    set(key: string, value: any): any;
}

/**
 * @infra baas
 */
export default class State implements IState  {
    name: string;
    client: DaprClient;

    constructor(name: string) {
        this.name = name;
        this.client = getClient();
    }

    /**
     * @infra permission
     */
    async get(key: string) {
        const value = await this.client.state.get(this.name, key);
        return value.toString();
    }

    /**
     * @infra permission
     */
    async set(key: string, value: any) {
        await this.client.state.save(this.name, [{ key, value }]);
    }
}
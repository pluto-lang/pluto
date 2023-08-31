import { DaprClient } from "@dapr/dapr";
import getClient from "./client";

/**
 * @infra baas
 */
export default class State {
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
        return await this.client.state.get(this.name, key);
    }

    /**
     * @infra permission
     */
    async set(key: string, value: any) {
        await this.client.state.save(this.name, [{ key, value }]);
    }
}
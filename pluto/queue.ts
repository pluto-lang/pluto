import { DaprClient } from "@dapr/dapr";
import getClient from "./client";
import { Event } from "./event";
import { assert } from "console";

/**
 * @infra faas
 */
type EventHandler = (event: any) => Promise<string>;

/**
 * @infra baas
 */
export class Queue {
    topic: string;
    client: DaprClient;

    constructor(topic: string) {
        this.topic = topic;
        this.client = getClient();
    }

    /**
     * @infra permission
     */
    public async push(message: any) {
        await this.client.pubsub.publish(this.topic, this.topic, message);
    }

    /**
     * @infra baas
     */
    public subscribe(handler: EventHandler) {
        const key = this.topic
        assert(!(key in subHandlers), `${key} handler already exists.`);
        subHandlers[key] = handler;
    }
}


const subHandlers: { [key: string]: EventHandler } = {}

export async function processEvent(event: Event) {
    console.log('receive an event: ', event);

    const key = event.topic
    if (!(key in subHandlers)) {
        console.error(`no such event handler for ${key}`);
        return;
    }
    await (subHandlers[key](event));
}
import { DaprClient } from "@dapr/dapr";
import getClient from "./client";
import { Event } from "./event";
import assert from "assert";

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

    public async push(message: any) {
        await this.client.pubsub.publish(getPubsubName(), this.topic, message);
    }

    /**
     * @infra faas
     */
    public subscribe(handler: EventHandler) {
        const key = `${getPubsubName()}-${this.topic}`
        assert(!(key in subHandlers), `${key} handler already exists.`);
        subHandlers[key] = handler;
    }
}


const subHandlers: { [key: string]: EventHandler } = {}

export async function processEvent(event: Event) {
    console.log('receive an event: ', event);
    
    const key = `${event.name}-${event.topic}`
    if (!(key in subHandlers)) {
        console.error(`no such event handler for ${key}`);
        return ;
    }
    await (subHandlers[key](event));
}

function getPubsubName(): string {
    return 'pubsub';
}
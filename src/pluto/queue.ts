import { DaprClient } from "@dapr/dapr";
import getClient from "./dapr/client";
import { Event } from "./event";
import { FaasResource } from "@pluto/pluto";

type EventHandler = (evt: Event) => Promise<string>;

export interface QueueDef {
    subscribe(fn: FaasResource | EventHandler): void;
}

export interface QueueClient {
    push(msg: any): void;
}

export interface QueueOptions { }

// TODO: abstract class
export class Queue implements QueueClient {
    constructor(name: string, opts?: QueueOptions) { }

    public static buildClient(name: string): QueueClient {
        const rtType = process.env['RUNTIME_TYPE'];
        switch (rtType?.toUpperCase()) {
            case 'AWS':
            case 'K8S':
                return new DaprQueueClient(name);
            default:
                throw new Error(`not support this runtime '${rtType}'`)
        }
    }
}

class DaprQueueClient implements QueueClient {
    topic: string;
    client: DaprClient;

    constructor(topic: string) {
        this.topic = topic;
        this.client = getClient();
    }

    public async push(message: any) {
        await this.client.pubsub.publish(this.topic, this.topic, message);
    }
}

export interface Queue extends QueueDef, QueueClient { }
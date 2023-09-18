import { DaprClient } from "@dapr/dapr";
import { BaasResource } from "./iac/BaasResource";
import { FaasResource } from "./iac/FaasResource";
import getClient from "./client";
import { Event } from "./event";

type EventHandler = (evt: Event) => Promise<string>;

export interface QueueDef {
    subscribe(fn: FaasResource): void;
}

export interface QueueClient {
    push(msg: any): void;
}

export interface Queue extends QueueDef, QueueClient { }

// TODO: abstract class
export class Queue extends BaasResource implements QueueDef {
    constructor(name: string, type?: string, opts?: {}) {
        super(type!, name, opts);
    }

    public subscribe(fn: EventHandler | FaasResource): void {
        throw new Error('use a subclass instead.')
    };

    public static buildClient(name: string): QueueClient {
        const rtType = process.env['RUNTIME_TYPE'];
        switch (rtType?.toUpperCase()) {
            case 'AWS':
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
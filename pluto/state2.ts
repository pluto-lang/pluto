import { DaprClient } from "@dapr/dapr";
import getClient from "./client";
import { FaasResource } from "./iac/FaasResource";
import { genId } from './utils';

export interface ResourceProps {}

export interface QueueProps extends ResourceProps {
    maxSize?: number;
}


const registry: { [rtType: string]: { [ResourceType: string]: { new(...args: any[]): any } } } = {}

/**
 * @client QueueClient
 */
abstract class Queue {
    name: string;

    constructor(name: string, props: QueueProps = {}) {
        this.name = name;
    }

    public abstract subscribe(fn: FaasResource): void;
    
    public static buildClient(id: string): any { 
        const rtType = process.env['RUNTIME_TYPE'];
        switch (rtType?.toUpperCase()) {
            case 'AWS':
                return AwsSnsQueue.buildClient(id);
            default:
                throw new Error(`not support this runtime '${rtType}'`)
        }
    };
}


interface QueueClient {
    push(message: string): void;
}


class AwsSnsQueue extends Queue {
    constructor(name: string, props: QueueProps = {}) {
        super(name, props);
    }

    public subscribe(fn: FaasResource): void {
        throw new Error("Method not implemented.");
    }

    public static buildClient(id: string): QueueClient {
        const name = process.env[`QUEUE_NAME_${id}`]
        if (name == undefined) {
            throw new Error(`env 'QUEUE_NAME_${id}' not exists`)
        }
        return new DaprQueueClient(name); 
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


registry['aws'] = {}
registry['aws']['Queue'] = AwsSnsQueue;


/** User Interface */

// const queue = new Queue("name", maxSize=10);
// queue.push();


/**
 * 要求name，是为了保证更新时，不会重建，导致丢失数据
 */

const queue: Queue = new AwsSnsQueue("hhh");
AwsSnsQueue.buildClient("ff");



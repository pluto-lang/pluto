import { Event, Request, Router, Queue, State, emit } from '@pluto';

import * as aws from "@pulumi/aws"
const bucketName = "bucket";
const bucket = new aws.s3.Bucket(bucketName)
bucket.onObjectCreated("event-handler", async () => {
    console.log("create an object");
})

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
const client = new S3Client();
client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: "all",
    Body: "test",
}))


const state = new State("statestore");
const queue = new Queue("access");
const router = new Router();

let counter = 0;

function count(name: string): Number {
    counter ++;
    return name.length;
}

// http get request.get("/baidu.com")  => result
// 1. PoC界面固定，1-2 case； 2. 验证阶段。

// Function Pattern

router.get("/hello", async (req: Request): Promise<string> => {
    const name = req.query['name'] ?? "Anonym";
    const message = `${name} access at ${Date.now()}`
    await queue.push({ name, message });
    await emit(count, name);
    return `Publish a message: ${message}`;
})

router.get("/store", async function storeHandler(req: Request): Promise<string> {
    const name = req.query['name'] ?? "Anonym";
    const message = await state.get(name);
    return `Fetch ${name} access message: ${message}.`;
})

queue.subscribe(async (event: Event): Promise<string> => {
    const data = event.data;
    await state.set(data['name'], data['message']);
    return 'receive an event';
})
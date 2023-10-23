import { Router, Queue, KVStore, CloudEvent, HttpRequest, HttpResponse } from "@plutolang/pluto";

const kvstore = new KVStore("kvstore");
const queue = new Queue("queue");
const router = new Router("router");

router.get("/hello", async (req: HttpRequest): Promise<HttpResponse> => {
  const name = req.query["name"] ?? "Anonym";
  const message = `${name} access at ${Date.now()}`;
  await queue.push(JSON.stringify({ name, message }));
  return {
    statusCode: 200,
    body: `Publish a message: ${message}`,
  };
});

router.get("/store", async (req: HttpRequest): Promise<HttpResponse> => {
  const name = req.query["name"] ?? "Anonym";
  const message = await kvstore.get(name);
  return {
    statusCode: 200,
    body: `Fetch ${name} access message: ${message}.`,
  };
});

queue.subscribe(async (evt: CloudEvent): Promise<void> => {
  const data = JSON.parse(evt.data);
  console.log(data);
  await kvstore.set(data["name"], data["message"]);
  return;
});

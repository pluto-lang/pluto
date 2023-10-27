import { Router, Queue, KVStore, CloudEvent, HttpRequest, HttpResponse } from "@plutolang/pluto";

// Currently, Pluto only supports deploying with a single file. Moreover, within each handler function, we do not provide support for accessing variables (except the resource variables), classes, or interfaces outside of the scope of the handler function.

const kvstore = new KVStore("kvstore");
const queue = new Queue("queue");
const router = new Router("router");

// Record the access time and publish a message to the queue.
router.get("/hello", async (req: HttpRequest): Promise<HttpResponse> => {
  const name = req.query["name"] ?? "Anonym";
  const message = `${name} access at ${Date.now()}`;
  await queue.push(JSON.stringify({ name, message }));
  return {
    statusCode: 200,
    body: `Publish a message: ${message}`,
  };
});

// Retrieve a message from the KV database based on its name.
router.get("/store", async (req: HttpRequest): Promise<HttpResponse> => {
  const name = req.query["name"] ?? "Anonym";
  const message = await kvstore.get(name);
  return {
    statusCode: 200,
    body: `Fetch ${name} access message: ${message}.`,
  };
});

// Subscribe to messages in the queue and store them in the KV database.
queue.subscribe(async (evt: CloudEvent): Promise<void> => {
  const data = JSON.parse(evt.data);
  await kvstore.set(data["name"], data["message"]);
  return;
});

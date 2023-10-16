import { Router, Queue, KVStore } from "@pluto/pluto";

const kvstore = new KVStore("kvstore");
const queue = new Queue("queue");
const router = new Router("router");

router.get("/hello", async (): Promise<string> => {
  // const name = req.query["name"] ?? "Anonym";
  const name = "Anonym";
  const message = `${name} access at ${Date.now()}`;
  await queue.push("{ name, message }");
  return `Publish a message: ${message}`;
});

router.get("/store", async (): Promise<string> => {
  // const name = req.query["name"] ?? "Anonym";
  const name = "Anonym";
  const message = await kvstore.get(name);
  return `Fetch ${name} access message: ${message}.`;
});

queue.subscribe(async (): Promise<string> => {
  // const data = event.data;
  const data = { name: "foo", message: "bar" };
  await kvstore.set(data["name"], data["message"]);
  return "receive an event";
});

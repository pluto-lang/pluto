import { Queue, KVStore, CloudEvent, Tester } from "@plutolang/pluto";

const kvstore = new KVStore("kvstore");
const queue = new Queue("queue");

// Subscribe to messages in the queue and store them in the KV database.
queue.subscribe(async (evt: CloudEvent): Promise<void> => {
  const data = JSON.parse(evt.data);
  await kvstore.set(data["name"], data["message"]);
  return;
});

const tester = new Tester("tester");

tester.it("push a message to the queue", async (): Promise<void> => {
  await queue.push(JSON.stringify({ name: "pluto", message: "test" }));
  const val = await kvstore.get("pluto");
  if (val !== "test") {
    throw new Error("failed.");
  }
});

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
  // It's possible that the message is not yet stored, even after it has been returned.
  await sleep(5000);
  const val = await kvstore.get("pluto");
  if (val !== "test") {
    throw new Error("failed.");
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

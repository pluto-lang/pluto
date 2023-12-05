import { Queue, KVStore, CloudEvent, Tester } from "@plutolang/pluto";

const kvstore = new KVStore("kvstore");
const queue = new Queue("queue");

// Subscribe to messages in the queue and store them in the KV database.
queue.subscribe(async (evt: CloudEvent): Promise<void> => {
  const data = JSON.parse(evt.data);
  await kvstore.set(data["name"], data["message"]);
  return;
});

const succTester = new Tester("succ-tester");

succTester.it("push a message to the queue", async (): Promise<void> => {
  await queue.push(JSON.stringify({ name: "pluto", message: "test" }));
  const val = await kvstore.get("pluto");
  if (val !== "test") {
    throw new Error("failed.");
  }
});

const failedTester = new Tester("failed-tester");

failedTester.it("failed case", async (): Promise<void> => {
  throw new Error("This is a failed case. It should throw an error.");
});

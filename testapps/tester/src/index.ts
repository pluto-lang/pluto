import { Queue, KVStore, CloudEvent, Tester, Router, Function } from "@plutolang/pluto";

/**
 * The following section is testing the KVStore and Queue.
 */
// TODO: bug: The variable name must match the argument. This is because the resource ID, generated
// during the deduction stage, depends on the variable name. Meanwhile, the resource ID generated at
// runtime depends on the user-provided argument. Ensuring these two are identical is crucial for
// the test command to function properly.
const kvstore = new KVStore("kvstore");
const queue = new Queue("queue");

// Subscribe to messages in the queue and store them in the KV database.
queue.subscribe(async (evt: CloudEvent): Promise<void> => {
  const data = JSON.parse(evt.data);
  await kvstore.set(data["name"], data["message"]);
  return;
});

const queueTester = new Tester("queueTester");

queueTester.it("push a message to the queue", async (): Promise<void> => {
  await queue.push(JSON.stringify({ name: "pluto", message: "test" }));
  // It's possible that the message is not yet stored, even after it has been returned.
  await sleep(10000);
  const val = await kvstore.get("pluto");
  if (val !== "test") {
    throw new Error("failed.");
  }
});

/**
 * The subsequent section conducts tests on the Router, which includes accessing properties via
 * router.url(), and making direct HTTP requests to the router.
 */
const router = new Router("router");

router.get("/hello", async () => {
  return {
    statusCode: 200,
    body: "Hello, Pluto",
  };
});

const routerTester = new Tester("routerTester");

routerTester.it("access the router url", async (): Promise<void> => {
  // TODO: In the simulation, all method no matter what they are, are async. Because all methods are
  // invoked via RPC. We need to discover if there is a way can invoke sync method synchronously.
  const url = await router.url();
  if (!url.startsWith("http")) {
    throw new Error("failed.");
  }
});

routerTester.it("GET /hello, responds with Hello, Pluto", async (): Promise<void> => {
  const url = await router.url();
  const res = await fetch(`${url}/hello`);
  const body = await res.text();
  if (body !== "Hello, Pluto") {
    throw new Error("failed.");
  }
});

/**
 * The following section tests the Function class.
 */
const echoFunction = new Function(async function (input: string) {
  return input;
}, /* name */ "echoFunction");

const functionTester = new Tester("functionTester");

functionTester.it("invoke the echo function", async (): Promise<void> => {
  const result = await echoFunction.invoke("hello");
  if (result !== "hello") {
    throw new Error("failed.");
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

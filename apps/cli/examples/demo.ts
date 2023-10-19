import { Router, KVStore, Queue } from "@pluto/pluto";

const kvstore = new KVStore("kvstore");
const queue = new Queue("queue");
const router = new Router("router");

router.get("/hello", () => {
  queue.push("hello");
});

router.get("/store", () => {
  const h = kvstore.get("hello");
  console.log(h);
});

queue.subscribe(() => {});

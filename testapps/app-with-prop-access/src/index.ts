import { Router, Tester, HttpRequest, HttpResponse } from "@plutolang/pluto";

const router = new Router("router");

router.get("/echo", async (req: HttpRequest): Promise<HttpResponse> => {
  const message = req.query["message"] ?? "Hello, Pluto!";
  return {
    statusCode: 200,
    body: Array.isArray(message) ? message.join(", ") : message,
  };
});

const tester = new Tester("tester");

tester.it("test echo", async () => {
  // TODO: In a simulated environment, the `url` method runs through rpc, making it an asynchronous
  // operation. This means we have to use `await` to fetch the result. However, in the real
  // environment, the `url` method operates synchronously, eliminating the need for `await` to
  // obtain the outcome. We need to find a way to handle this situation.
  const res = await fetch((await router.url()) + "/echo?message=Hello%20Pluto!");
  const body = await res.text();
  if (res.status !== 200) {
    throw new Error(`Unexpected status code: ${res.status}, body: ${body}`);
  }
  if (body !== "Hello Pluto!") {
    throw new Error(`Unexpected body: ${body}`);
  }
});

import { Router, Tester, HttpRequest, HttpResponse } from "@plutolang/pluto";

const router = new Router("router");

router.get("/echo", async (req: HttpRequest): Promise<HttpResponse> => {
  const message = req.query["message"] ?? "Hello, Pluto!";
  return {
    statusCode: 200,
    body: message,
  };
});

const tester = new Tester("e2e");

tester.it("test echo", async () => {
  // Verify the correctness of business logic.
  const res = await fetch(router.url + "/echo?message=Hello%20Pluto!");
  const body = await res.text();
  if (res.status !== 200) {
    throw new Error(`Unexpected status code: ${res.status}`);
  }
  if (body !== "Hello Pluto!") {
    throw new Error(`Unexpected body: ${body}`);
  }
});

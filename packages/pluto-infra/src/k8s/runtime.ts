import fs from "fs";
import express, { Request, Response } from "express";
import { CloudEvent, HttpRequest } from "@plutolang/pluto";
import { HTTP } from "cloudevents";

const COMPUTE_MODULE = process.env.COMPUTE_MODULE || "";
if (COMPUTE_MODULE === "" || !fs.existsSync(COMPUTE_MODULE))
  throw new Error("cannot find 'COMPUTE_MODULE' env, or the path 'COMPUTE_MODULE' is invalid");
const handleImporter = import(COMPUTE_MODULE);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all("*", async (req: Request, res: Response) => {
  const handle = (await handleImporter).default;

  if (HTTP.isEvent({ headers: req.headers, body: req.body })) {
    // Handle event
    if (req.body.length < 2) {
      throw new Error("Event is invalid: ", req.body);
    }

    const evt: CloudEvent = JSON.parse(req.body[1]);
    try {
      await handle(evt);
    } catch (e) {
      console.log("Event processing failed:", e);
    }
  } else {
    // Handle HTTP requests
    const reqPluto: HttpRequest = {
      path: req.path,
      method: req.method,
      headers: {},
      query: {},
      body: req.body,
    };
    for (let key in req.query) {
      reqPluto.query[key] = req.query[key] as string;
    }
    console.log(reqPluto);

    try {
      const respBody = await handle(reqPluto);
      res.send(respBody);
    } catch (e) {
      console.log("Http processing failed:", e);
    }
  }
});

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log("Hello world listening on port", port);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});

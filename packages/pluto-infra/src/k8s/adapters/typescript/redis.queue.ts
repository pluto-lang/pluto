import http from "http";
import { CloudEvent } from "@plutolang/pluto";
import { RuntimeHandler } from "../../types";

declare const __handler_: (...args: any[]) => Promise<any>;

export const handler: RuntimeHandler = async (_, res, parsed) => {
  if (!parsed.body) {
    res.writeHead(400);
    res.end(`The body of the request is empty.`);
    return;
  }

  const events = JSON.parse(parsed.body);
  if (events.length < 2) {
    res.writeHead(400);
    res.end(`Event is invalid: ${parsed.body}`);
    return;
  }

  const evt: CloudEvent = JSON.parse(events[1]);
  try {
    await __handler_(evt);
    responseAndClose(res, 200, "");
  } catch (e) {
    responseAndClose(res, 500, `Event processing failed: ${e}`);
  }
};

function responseAndClose(res: http.ServerResponse, statusCode: number, message?: string) {
  res.writeHead(statusCode, "text/plain");
  res.end(message);
}

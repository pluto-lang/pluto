import http from "http";
import { DirectCallResponse } from "@plutolang/pluto";
import { RuntimeHandler } from "../../types";

declare const __handler_: (...args: any[]) => Promise<any>;

export const handler: RuntimeHandler = async (_, res, parsedBody) => {
  try {
    const payload = JSON.parse(parsedBody.body ?? "[]");
    console.log("Payload:", payload);
    if (!Array.isArray(payload)) {
      responseAndClose(res, 500, `Payload should be an array.`);
      return;
    }

    let response: DirectCallResponse;
    try {
      const respBody = await __handler_(...payload);
      response = {
        code: 200,
        body: respBody,
      };
    } catch (e) {
      // The error comes from inside the user function.
      console.log("Function execution failed:", e);
      response = {
        code: 400,
        body: `Function execution failed: ` + (e instanceof Error ? e.message : e),
      };
    }
    responseAndClose(res, 200, JSON.stringify(response), /* contentType */ "application/json");
  } catch (e) {
    // The error is caused by the HTTP processing, not the user function.
    console.log("Http processing failed:", e);
    responseAndClose(res, 500, "Internal Server Error");
  }
};

function responseAndClose(
  res: http.ServerResponse,
  statusCode: number,
  message?: string,
  contentType?: string
) {
  res.writeHead(statusCode, { "Content-Type": contentType || "text/plain" });
  res.end(message);
}

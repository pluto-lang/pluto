import http from "http";
import { HttpRequest } from "@plutolang/pluto";
import { RuntimeHandler } from "../../types";

declare const __handler_: (...args: any[]) => Promise<any>;

export const handler: RuntimeHandler = async (req, res, parsed) => {
  const plutoRequest: HttpRequest = {
    path: parsed.url.pathname || "/",
    method: req.method || "UNKNOWN",
    headers: {},
    query: parsed.url.query || {},
    body: parsed.body ?? null,
  };
  console.log("Request:", plutoRequest);

  try {
    const respBody = await __handler_(plutoRequest);
    responseAndClose(
      res,
      respBody.statusCode,
      JSON.stringify(respBody.body),
      /*contentType*/ "application/json"
    );
  } catch (e) {
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

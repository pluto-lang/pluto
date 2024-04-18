import http from "http";
import url from "url";
import qs from "querystring";
import { RuntimeHandler } from "../../types";

declare const __handler_: RuntimeHandler;

export function handler() {
  const port = process.env.PORT || "8080";

  const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Ensure the request body exists.
    if (!req.headers["content-type"]) {
      console.warn(" Content-Type header is missing");
    }

    // Parse the request body
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      console.log("Received a request: ", req.url);
      try {
        const parsedUrl = url.parse(req.url || "", /* parseQueryString */ true);

        // Parse the request body based on the type of request.
        const contentType = req.headers["content-type"];
        let parsedBody: string | undefined;
        if (contentType === "application/json") {
          parsedBody = body;
        } else if (contentType === "application/x-www-form-urlencoded") {
          parsedBody = JSON.stringify(qs.parse(body));
        } else {
          console.warn("Unsupported content type: ", contentType);
        }

        await __handler_(req, res, { url: parsedUrl, body: parsedBody }).catch((e) => {
          console.error("Encountered an error when calling the runtime handler, ", e);
          responseAndClose(res, 500, "Internal Server Error");
        });
      } catch (e) {
        console.error(`Faild to parse body and url.`, e);
        responseAndClose(res, 500, "Internal Server Error");
      }
    });
  });

  server.listen(parseInt(port, 10), () => {
    console.log(`Listening on port ${port}`);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
    });
  });
}

interface ResponseAndCloseOptions {
  readonly contentType?: string;
}

function responseAndClose(
  res: http.ServerResponse,
  statusCode: number,
  message?: string,
  options?: ResponseAndCloseOptions
) {
  res.writeHead(statusCode, { "Content-Type": options?.contentType || "text/plain" });
  res.end(message);
}

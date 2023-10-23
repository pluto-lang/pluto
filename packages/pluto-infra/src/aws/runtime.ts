import { CloudEvent, HttpRequest } from "@plutolang/pluto";

const COMPUTE_MODULE = process.env["COMPUTE_MODULE"];
if (!COMPUTE_MODULE) {
  throw new Error("Missing COMPUTE_MODULE environment variable");
}

const mod = import(COMPUTE_MODULE);

export default async (event: any, context: any) => {
  const handler = (await mod).default;

  const accountId = context.invokedFunctionArn.split(":")[4];
  process.env["AWS_ACCOUNT_ID"] = accountId;

  if ("Records" in event) {
    // Event Handler
    for (const record of event["Records"]) {
      if (!("Sns" in record)) {
        throw new Error(`Unsupported event type ${JSON.stringify(record)}`);
      }

      const payload = record["Sns"]["Message"];
      const event: CloudEvent = JSON.parse(payload);
      console.log("Pluto: Handling event: ", event);
      await handler(event).catch((e: any) => {
        console.log("Faild to handle event: ", e);
      });
    }
  } else {
    // HTTP Handler
    const request: HttpRequest = {
      path: event.resource,
      method: event.httpMethod,
      headers: event.headers,
      query: event.queryStringParameters,
      body: event.body,
    };
    console.log("Pluto: Handling HTTP request: ", request);
    return await handler(request).catch((e: any) => {
      console.log("Faild to handle http request: ", e);
    });
  }
};

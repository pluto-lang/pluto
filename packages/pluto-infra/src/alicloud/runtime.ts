import { CloudEvent, HttpRequest } from "@plutolang/pluto";

const COMPUTE_MODULE = process.env["COMPUTE_MODULE"];
if (!COMPUTE_MODULE) {
  throw new Error("Missing COMPUTE_MODULE environment variable");
}

const mod = import(COMPUTE_MODULE);

type CallbackFn = (error: Error | null, data?: object) => Promise<void>;

// eslint-disable-next-line
export default async (inData: Buffer, context: any, callback: CallbackFn) => {
  const handler = (await mod).default;

  const accountId = context.accountId;
  process.env["ALICLOUD_ACCOUNT_ID"] = accountId;

  const event = JSON.parse(inData.toString());
  if ("Records" in event) {
    // Event Handler
    for (const record of event["Records"]) {
      if (!("Sns" in record)) {
        throw new Error(`Unsupported event type ${JSON.stringify(record)}`);
      }

      const payload = record["Sns"]["Message"];
      const event: CloudEvent = JSON.parse(payload);
      console.log("Pluto: Handling event: ", event);
      await handler(event).catch((e: Error) => {
        console.log("Faild to handle event: ", e);
      });
    }
  } else if ("detail-type" in event && event["detail-type"] === "Scheduled Event") {
    // Schedule Event Handler
    await handler().catch((e: Error) => {
      console.log("Faild to handle event: ", e);
    });
  } else {
    // HTTP Handler
    const request: HttpRequest = {
      path: event.path,
      method: event.httpMethod,
      headers: event.headers,
      query: event.queryParameters ?? {},
      body: event.body,
    };
    console.log("Pluto: Handling HTTP request: ", request);
    const respData = await handler(request).catch((e: Error) => {
      console.log("Faild to handle http request: ", e);
    });

    console.log("Pluto: HTTP response: ", respData);
    if (respData.statusCode !== 200) {
      callback(new Error(respData.body));
    } else {
      callback(null, respData.body);
    }
  }
};

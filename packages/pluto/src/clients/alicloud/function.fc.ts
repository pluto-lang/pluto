import Credential from "@alicloud/credentials";
import * as OpenApi from "@alicloud/openapi-client";
import { RuntimeOptions, default as TeaUtil } from "@alicloud/tea-util";
import {
  InvokeFunctionRequest,
  InvokeFunctionHeaders,
  default as FCClient,
} from "@alicloud/fc-open20210406";
import { genResourceId } from "@plutolang/base/utils";
import {
  AnyFunction,
  IFunctionClient,
  DEFAULT_FUNCTION_NAME,
  Function,
  DirectCallResponse,
} from "../../function";
import { genAliResourceName } from "./utils";
import { InvokeError } from "../errors";

export class FCInstance<T extends AnyFunction> implements IFunctionClient<T> {
  private readonly id: string;

  private readonly serviceName: string;
  private readonly functionName: string;

  constructor(func: T, name?: string) {
    this.id = genResourceId(Function.fqn, name || DEFAULT_FUNCTION_NAME);
    this.serviceName = genAliResourceName(this.id, "svc");
    this.functionName = genAliResourceName(this.id, "fc");
    func;
  }

  public url(): string {
    throw new Error("The FC URL is currently not supported.");
  }

  public async invoke(...args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>> {
    const client = createClient();
    const invokeFunctionHeaders = new InvokeFunctionHeaders({
      xFcInvocationType: "Sync", // Async, Sync
      xFcLogType: "None", // None, Tail
    });
    const invokeFunctionRequest = new InvokeFunctionRequest({
      qualifier: "LATEST", // The version of the function to be invoked.
      body: TeaUtil.toBytes(JSON.stringify(args)),
    });
    const runtime = new RuntimeOptions({});

    try {
      const response = await client.invokeFunctionWithOptions(
        this.serviceName,
        this.functionName,
        invokeFunctionRequest,
        invokeFunctionHeaders,
        runtime
      );

      if (response.statusCode === 200) {
        // The process of invoking the function is successful.
        const data: DirectCallResponse = JSON.parse(response.body.toString());
        if (data.code === 200) {
          // The function is successfully executed.
          return data.body;
        } else {
          // The function is failed to execute.
          throw new InvokeError(data.body);
        }
      } else {
        // The process of invoking the function is failed.
        throw new Error(`The response status code is ${response.statusCode}.`);
      }
    } catch (error) {
      if (error instanceof InvokeError) {
        // Re-throw the InvokeError came from insied the user function.
        throw error;
      } else {
        console.error("Error calling AliCloud FC function:", error);
        throw new Error(`The invocation of the AliCloud FC '${this.id}' has failed.`);
      }
    }
  }
}

function createClient(): FCClient {
  // Pluto require user to provide the access key and secret key by setting the environment
  // variables ALICLOUD_ACCESS_KEY and ALICLOUD_SECRET_KEY. But the credential uses the environment
  // variables ALIBABA_CLOUD_ACCESS_KEY_ID and ALIBABA_CLOUD_ACCESS_KEY_SECRET. So we need to set
  // the environment variables ALIBABA_CLOUD_ACCESS_KEY_ID and ALIBABA_CLOUD_ACCESS_KEY_SECRET to
  // the values of ALICLOUD_ACCESS_KEY and ALICLOUD_SECRET_KEY.
  process.env["ALIBABA_CLOUD_ACCESS_KEY_ID"] = process.env["ALICLOUD_ACCESS_KEY"];
  process.env["ALIBABA_CLOUD_ACCESS_KEY_SECRET"] = process.env["ALICLOUD_SECRET_KEY"];

  const config = new OpenApi.Config();
  // The document about the credential can be found at
  // https://help.aliyun.com/zh/sdk/developer-reference/v2-manage-node-js-access-credentials
  const credentialClient = new Credential();
  config.credential = credentialClient;
  // For reference on Endpoint, please visit https://api.aliyun.com/product/FC-Open
  config.endpoint = `1411494491720355.cn-hangzhou.fc.aliyuncs.com`;
  return new FCClient(config);
}

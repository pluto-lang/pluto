import { LambdaClient, InvokeCommand, InvokeCommandInput } from "@aws-sdk/client-lambda";
import {
  AnyFunction,
  FunctionOptions,
  IFunctionClient,
  DEFAULT_FUNCTION_NAME,
  Function,
  DirectCallResponse,
} from "../../function";
import { genResourceId, getEnvValForProperty } from "@plutolang/base/utils";
import { genAwsResourceName } from "./utils";
import { InvokeError } from "../errors";

const successfulStatusCode = {
  RequestResponse: 200,
  Event: 202,
  DryRun: 204,
};

export class LambdaFunction<T extends AnyFunction> implements IFunctionClient<T> {
  private readonly id: string;
  private readonly lambdaName: string;

  constructor(func: T, opts?: FunctionOptions) {
    this.id = genResourceId(Function.fqn, opts?.name || DEFAULT_FUNCTION_NAME);
    this.lambdaName = genAwsResourceName(this.id);
    func;
  }

  public url(): string {
    return getEnvValForProperty(this.id, "url");
  }

  public async invoke(...args: Parameters<T>): Promise<Awaited<ReturnType<T> | void>> {
    const lambdaClient = new LambdaClient();
    const params: InvokeCommandInput = {
      FunctionName: this.lambdaName,
      InvocationType: "RequestResponse",
      LogType: "None",
      Payload: JSON.stringify(args), // 可选
    };
    try {
      const command = new InvokeCommand(params);
      const response = await lambdaClient.send(command);

      // Check if the invocation process is successful.
      if (successfulStatusCode[params.InvocationType!] !== response.StatusCode) {
        // The invocation process is failed.
        throw new Error(
          `The invocation of the Lambda function '${this.id}' has failed, returning a status code of ${response.StatusCode}, with the following function error: ${response.FunctionError}.`
        );
      }

      if (response.Payload !== undefined) {
        // The invocation process is successful.
        const payload: DirectCallResponse = JSON.parse(Buffer.from(response.Payload).toString());
        if (payload.code === 200) {
          // The function is successfully executed.
          return payload.body;
        } else {
          // The function is failed to execute.
          throw new InvokeError(payload.body);
        }
      } else {
        // The invocation process is successful, but the payload is empty.
        throw new Error(
          `The invocation of the Lambda function has failed, returning an empty payload.`
        );
      }
    } catch (error) {
      if (error instanceof InvokeError) {
        // Re-throw the InvokeError came from insied the user function.
        throw error;
      } else {
        console.error("Error calling Lambda function:", error);
        throw new Error(`The invocation of the AWS Lambda '${this.id}' has failed.`);
      }
    }
  }
}

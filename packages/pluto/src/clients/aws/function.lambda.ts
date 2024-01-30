import { LambdaClient, InvokeCommand, InvokeCommandInput } from "@aws-sdk/client-lambda";
import {
  AnyFunction,
  FunctionOptions,
  IFunctionClient,
  DEFAULT_FUNCTION_NAME,
  Function,
} from "../../function";
import { genResourceId } from "@plutolang/base/utils";
import { genAwsResourceName } from "./utils";

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

      if (successfulStatusCode[params.InvocationType!] !== response.StatusCode) {
        throw new Error(
          `The invocation of the Lambda function '${this.id}' has failed, returning a status code of ${response.StatusCode}, with the following function error: ${response.FunctionError}.`
        );
      }

      if (response.Payload !== undefined) {
        const payload = JSON.parse(Buffer.from(response.Payload).toString());
        return payload as Awaited<ReturnType<T>>;
      }
      return;
    } catch (error) {
      console.error("Error calling Lambda function:", error);
      throw new Error(
        `The invocation of the Lambda function '${this.id}' has failed, with the following error message: ${error}`
      );
    }
  }
}

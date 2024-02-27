import { SageMakerRuntimeClient, InvokeEndpointCommand } from "@aws-sdk/client-sagemaker-runtime";
import { utils } from "@plutolang/base";
import {
  ISageMakerClient,
  SageMakerOptions,
  SageMaker as SageMakerProto,
} from "../../sagemaker.aws";
import { genAwsResourceName } from "./utils";

export class SageMaker implements ISageMakerClient {
  private readonly id: string;
  private readonly endpointName: string;

  private readonly client: SageMakerRuntimeClient;

  constructor(name: string, imageUri: string, opts?: SageMakerOptions) {
    this.id = utils.genResourceId(SageMakerProto.fqn, name);
    this.endpointName = genAwsResourceName(this.id, "endpoint");
    this.client = new SageMakerRuntimeClient({});

    imageUri;
    opts;
  }

  public async invoke(inputData: any): Promise<any> {
    const command = new InvokeEndpointCommand({
      EndpointName: this.endpointName,
      Body: JSON.stringify(inputData),
      ContentType: "application/json",
      Accept: "application/json",
    });

    try {
      const response = await this.client.send(command);
      const responseBody = new TextDecoder().decode(response.Body);
      return JSON.parse(responseBody);
    } catch (error) {
      console.error("Error invoking SageMaker endpoint", error);
      throw error;
    }
  }

  public endpointUrl(): string {
    return utils.getEnvValForProperty(this.id, "endpointUrl");
  }
}

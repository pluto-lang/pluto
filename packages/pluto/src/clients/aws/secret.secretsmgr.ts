import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { utils } from "@plutolang/base";
import { ISecretClient, Secret as SecretProto } from "../../secret";
import { genAwsResourceName } from "./utils";

export class Secret implements ISecretClient {
  private readonly name: string;
  private readonly id: string;

  private readonly client: SecretsManagerClient;

  constructor(name: string, value: string) {
    this.name = name;
    this.id = utils.genResourceId(SecretProto.fqn, name);
    this.client = new SecretsManagerClient();
    value;
  }

  public async get(): Promise<string> {
    const secretResName = genAwsResourceName(this.id);

    const command = new GetSecretValueCommand({ SecretId: secretResName });

    try {
      const secretValueResponse = await this.client.send(command);

      if (secretValueResponse.SecretString) {
        return secretValueResponse.SecretString;
      }

      throw new Error(`No secret value found for secret: ${this.name}`);
    } catch (error) {
      console.error("Error retrieving secret", error);
      throw error;
    }
  }
}

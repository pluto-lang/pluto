import * as os from "os";
import { randomUUID } from "crypto";
import { fromEnv, fromIni } from "@aws-sdk/credential-providers";
import { sleep } from "./tools";

const AWS_CREDENTIALS_QUERY_URL =
  "https://ryo1adp0pe.execute-api.us-east-1.amazonaws.com/dev/query";

export interface AwsCredential {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export async function getAwsCredentialsFromAuthService(userId: string): Promise<AwsCredential> {
  const queryUrl = AWS_CREDENTIALS_QUERY_URL + `?userId=${userId}`;
  const response = await fetch(queryUrl);
  if (response.status != 200) {
    throw new Error(`Get credentials failed, ${await response.text()}.`);
  }
  const data = await response.json();
  return {
    accessKeyId: data["AccessKeyId"],
    secretAccessKey: data["SecretAccessKey"],
    sessionToken: data["SessionToken"],
  };
}

export async function getAwsCredentialsFromLocal(): Promise<AwsCredential | undefined> {
  // Get credentials from envrionment variables.
  const envProvider = fromEnv();
  let identity = await envProvider().catch(() => undefined);
  if (identity != undefined) {
    return {
      accessKeyId: identity.accessKeyId,
      secretAccessKey: identity.secretAccessKey,
      sessionToken: identity.sessionToken,
    };
  }

  // Get credentials from shared INI credentials file.
  // TODO: Currently, the default path to ~/.aws/credentials is being used.
  //   Enable users to specify the path to the shared credentials file.
  const profile = process.env.AWS_PROFILE ?? "default";
  const credsFilepath = `${os.homedir()}/.aws/credentials`;
  const configFilepath = `${os.homedir()}/.aws/config`;
  const iniProvider = fromIni({
    profile: profile,
    filepath: credsFilepath,
    configFilepath: configFilepath,
  });
  identity = await iniProvider().catch(() => undefined);
  if (identity != undefined) {
    return {
      accessKeyId: identity.accessKeyId,
      secretAccessKey: identity.secretAccessKey,
      sessionToken: identity.sessionToken,
    };
  }
  return undefined;
}

// TODO: move to cli, and add a role name so that users can change thier accounts.
export async function createPlutoRole(): Promise<string> {
  // Guide users to create PLRole. Open one tab in the browser.
  const userId = randomUUID();
  const stackId = userId.split("-")[0];
  const url = `https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/quickcreate?templateURL=https://plutolang.s3.amazonaws.com/roleTemplate.yml&stackName=PLSetup-${stackId}&param_RoleName=PLRole-${stackId}&param_UserId=${userId}`;
  open(url);

  let succ = false;
  const interval = 10;
  for (let i = 0; i < (3 * 60) / interval; i++) {
    await sleep(interval);
    try {
      await getAwsCredentialsFromAuthService(userId);
      succ = true;
      break;
    } catch (e) {
      console.log("Waiting for PLRole creation...");
    }
  }

  if (succ) {
    console.log("Successfully created PLRole!");
    return userId;
  } else {
    throw new Error("Failed to create PLRole.");
  }
}

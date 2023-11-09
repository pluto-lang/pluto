import fs from "fs";
import os from "os";
import path from "path";
import fse from "fs-extra";
import * as yaml from "js-yaml";
import open from "open";
import { randomUUID } from "crypto";
import { ConfigMap } from "@pulumi/pulumi/automation";
import { fromEnv, fromIni } from "@aws-sdk/credential-providers";
import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";
import { project, runtime } from "@plutolang/base";

const PLUTO_GLOBAL_CONFIG_PATH = path.join(os.homedir(), ".pluto", "config.yml");
const AWS_CREDENTIALS_QUERY_URL =
  "https://ryo1adp0pe.execute-api.us-east-1.amazonaws.com/dev/query";

export type PlutoGlobalConfig = { [key: string]: unknown };

type configGenFn = (sta: project.Stack) => Promise<ConfigMap>;

export async function genPulumiConfigByRuntime(sta: project.Stack): Promise<ConfigMap> {
  const genFnMapping: { [key in runtime.Type]?: configGenFn } = {
    [runtime.Type.AWS]: genPulumiConfigForAWS,
    [runtime.Type.K8s]: genPulumiConfigForK8s,
  };
  if (!(sta.runtime.type in genFnMapping)) {
    throw new Error("Not support this runtime.");
  }
  return await genFnMapping[sta.runtime.type]!(sta);
}

export async function genPulumiConfigForAWS(): Promise<ConfigMap> {
  const region = await getRegion();
  if (region == undefined) {
    throw new Error(
      "Please make sure to set your default region by setting the AWS_REGION environment variable first."
    );
  }

  let creds = await getAwsCredentialsFromLocal();
  if (creds == undefined) {
    const plutoConfig = readPlutoGlobalConfig();
    if (!("userId" in plutoConfig)) {
      console.info(
        "There is not any AWS credentials on your machine. We will guide you through the process of creating an AWS Role. We will open a new tab in your browser to create a CloudFormation stack. Please complete the creation process there."
      );

      const userId = await createPlutoRole();
      plutoConfig["userId"] = userId;
      savePlutoGlobalConfig(plutoConfig);
    }
    creds = await getAwsCredentialsFromAuthService(plutoConfig["userId"] as string);
    if (process.env.DEBUG) {
      console.debug("Got credentials from auth service.");
    }
  }
  process.env["AWS_ACCESS_KEY_ID"] = creds.accessKeyId;
  process.env["AWS_SECRET_ACCESS_KEY"] = creds.secretAccessKey;
  process.env["AWS_SESSION_TOKEN"] = creds.sessionToken;

  return {
    "aws:region": { value: region },
  };
}

async function genPulumiConfigForK8s(sta: project.Stack): Promise<ConfigMap> {
  const k8sRt = sta.runtime as project.K8sRuntime;
  return {
    "kubernetes:kubeconfig": { value: k8sRt.kubeConfigPath },
  };
}

interface AwsCredential {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export function readPlutoGlobalConfig(): PlutoGlobalConfig {
  let plutoConfig: PlutoGlobalConfig = {};
  if (fs.existsSync(PLUTO_GLOBAL_CONFIG_PATH)) {
    const plutoConfigText = fs.readFileSync(PLUTO_GLOBAL_CONFIG_PATH, "utf-8");
    plutoConfig = yaml.load(plutoConfigText) as PlutoGlobalConfig;
  }
  return plutoConfig;
}

export function savePlutoGlobalConfig(plutoConfig: PlutoGlobalConfig) {
  fse.ensureFileSync(PLUTO_GLOBAL_CONFIG_PATH);
  fse.writeFileSync(PLUTO_GLOBAL_CONFIG_PATH, yaml.dump(plutoConfig));
}

export async function createPlutoRole(): Promise<string> {
  // Guide users to create PLRole. Open one tab in the browser.
  const userId = randomUUID();
  const stackId = userId.split("-")[0];
  const url = `https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/quickcreate?templateURL=https://plutolang.s3.amazonaws.com/roleTemplate.yml&stackName=PLSetup-${stackId}&param_RoleName=PLRole-${stackId}&param_UserId=${userId}`;
  await open(url);

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
    };
  }
  return undefined;
}

async function getRegion(): Promise<string | undefined> {
  if (process.env.AWS_REGION) {
    return process.env.AWS_REGION;
  }

  const profile = process.env.AWS_PROFILE ?? "default";
  const awsConfig = await loadSharedConfigFiles();
  const profileConfig = awsConfig.configFile[profile];
  if (profileConfig) {
    const region = profileConfig["region"];
    return region;
  }
  return;
}

function sleep(sec: number) {
  return new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

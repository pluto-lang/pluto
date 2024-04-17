import { ConfigMap } from "@pulumi/pulumi/automation";
import { config, PlatformType } from "@plutolang/base";
import {
  createPlutoRole,
  getAwsCredentialsFromAuthService,
  getAwsCredentialsFromLocal,
} from "./aws-credentials";
import { getAwsRegion } from "./aws-region";
import { readPlutoGlobalConfig, savePlutoGlobalConfig } from "./pluto-config";

type configGenFn = (sta: config.Stack) => Promise<ConfigMap>;

export async function genPulumiConfig(sta: config.Stack): Promise<ConfigMap> {
  const genFnMapping: { [key in PlatformType]?: configGenFn } = {
    [PlatformType.AWS]: genPulumiConfigForAWS,
    [PlatformType.K8s]: genPulumiConfigForK8s,
    [PlatformType.AliCloud]: genPulumiConfigForAliCloud,
  };
  if (!(sta.platformType in genFnMapping)) {
    throw new Error("Not support this runtime.");
  }
  return await genFnMapping[sta.platformType]!(sta);
}

async function genPulumiConfigForAWS(): Promise<ConfigMap> {
  const region = await getAwsRegion();
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
  if (creds.sessionToken) {
    process.env["AWS_SESSION_TOKEN"] = creds.sessionToken;
  }

  return {
    "aws:region": { value: region },
  };
}

async function genPulumiConfigForK8s(sta: config.Stack): Promise<ConfigMap> {
  const configMap: ConfigMap = {};
  for (const [key, value] of Object.entries(sta.configs)) {
    if (key.startsWith("kubernetes:")) {
      configMap[key] = { value };
    }
  }
  return configMap;
}

async function genPulumiConfigForAliCloud(sta: config.Stack): Promise<ConfigMap> {
  sta;
  if (
    !process.env.ALICLOUD_REGION ||
    !process.env.ALICLOUD_ACCESS_KEY ||
    !process.env.ALICLOUD_SECRET_KEY
  ) {
    throw new Error(
      "You need to set the ALICLOUD_REGION, ALICLOUD_ACCESS_KEY, and ALICLOUD_SECRET_KEY environment variables."
    );
  }
  return {};
}

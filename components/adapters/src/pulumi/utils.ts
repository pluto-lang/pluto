import { ConfigMap } from "@pulumi/pulumi/automation";
import { loadSharedConfigFiles } from "@smithy/shared-ini-file-loader";
import { project, runtime } from "@pluto/base";

type configGenFn = (sta: project.Stack) => Promise<ConfigMap>;

export async function genPulumiConfigByRuntime(sta: project.Stack): Promise<ConfigMap> {
  const genFnMapping: { [key in runtime.Type]?: configGenFn } = {
    [runtime.Type.AWS]: genPulumiConfigForAWS,
    [runtime.Type.K8s]: genPulumiConfigForK8s,
  };
  if (!(sta.runtime.type in genFnMapping)) {
    throw new Error("Not support this runtime.");
  }
  return genFnMapping[sta.runtime.type]!(sta);
}

export async function genPulumiConfigForAWS(sta: project.Stack): Promise<ConfigMap> {
  const creds = await getAwsCredentials();
  return {
    "aws:region": { value: creds.region },
    "aws:accessKey": { value: creds.accessKeyId },
    "aws:secretKey": { value: creds.secretAccessKey },
  };
}

async function genPulumiConfigForK8s(sta: project.Stack): Promise<ConfigMap> {
  const k8sRt = sta.runtime as project.K8sRuntime;
  return {
    "kubernetes:kubeconfig": { value: k8sRt.kubeConfigPath },
  };
}

interface AwsCredentials {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export async function getAwsCredentials(): Promise<AwsCredentials> {
  // Get credentials from shared INI credentials file.
  // TODO: Currently, the default path to ~/.aws/credentials is being used.
  //   Enable users to specify the path to the shared credentials file.
  const profile = process.env.AWS_PROFILE ?? "default";
  const awsConfig = await loadSharedConfigFiles();
  const profileConfig = awsConfig.configFile[profile];
  const profileCreds = awsConfig.credentialsFile[profile];
  if (profileCreds) {
    const region = profileConfig["region"];
    const accessKeyId = profileCreds["aws_access_key_id"];
    const secretAccessKey = profileCreds["aws_secret_access_key"];
    if (region && accessKeyId && secretAccessKey) {
      if (process.env.DEBUG) {
        console.log("Got credentials from file.");
      }
      return { region, accessKeyId, secretAccessKey };
    }
  }
  if (process.env.DEBUG) {
    console.log("Failed to retrieve credentials from file.");
  }

  // Get from enviroment variables.
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (region && accessKeyId && secretAccessKey) {
    if (process.env.DEBUG) {
      console.log("Got credentials from env.");
    }
    return { region, accessKeyId, secretAccessKey };
  }
  if (process.env.DEBUG) {
    console.log("Failed to retrieve credentials from env var.");
  }

  throw new Error(
    "Unable to retrieve the AWS credentials. You must set the AWS credentials either through the use of AWS CLI or environment variables."
  );
}

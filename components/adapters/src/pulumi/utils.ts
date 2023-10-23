import { ConfigMap } from "@pulumi/pulumi/automation";
import { project, runtime } from "@pluto/base";

import { loadSharedConfigFiles } from "@smithy/shared-ini-file-loader";

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

async function genPulumiConfigForAWS(sta: project.Stack): Promise<ConfigMap> {
  const awsRt = sta.runtime as project.AwsRuntime;
  const { accessKeyId, secretAccessKey } = await getAwsCredentials();
  return {
    "aws:region": { value: awsRt.region },
    "aws:accessKey": { value: accessKeyId },
    "aws:secretKey": { value: secretAccessKey },
  };
}

async function genPulumiConfigForK8s(sta: project.Stack): Promise<ConfigMap> {
  const k8sRt = sta.runtime as project.K8sRuntime;
  return {
    "kubernetes:kubeconfig": { value: k8sRt.kubeConfigPath },
  };
}

async function getAwsCredentials(): Promise<{ [key: string]: string }> {
  // Get credentials from shared INI credentials file.
  // TODO: Currently, the default path to ~/.aws/credentials is being used.
  //   Enable users to specify the path to the shared credentials file.
  const profile = process.env.AWS_PROFILE ?? "default";
  const awsConfig = await loadSharedConfigFiles();
  const profileCreds = awsConfig.credentialsFile[profile];
  if (profileCreds) {
    const accessKeyId = profileCreds["aws_access_key_id"];
    const secretAccessKey = profileCreds["aws_secret_access_key"];
    if (accessKeyId && secretAccessKey) {
      return { accessKeyId, secretAccessKey };
    }
  }
  if (process.env.DEBUG) {
    console.log("Failed to retrieve credentials from file.");
  }

  // Get from enviroment variables.
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey };
  }
  if (process.env.DEBUG) {
    console.log("Failed to retrieve credentials from env var.");
  }

  throw new Error(
    "Unable to retrieve the AWS credentials. You must set the AWS credentials either through the use of AWS CLI or environment variables."
  );
}

import { ConfigMap } from "@pulumi/pulumi/automation";
import { project, runtime } from "@pluto/base";

export function genPulumiConfigByRuntime(sta: project.Stack): ConfigMap {
  const genFnMapping: { [key in runtime.Type]?: (sta: project.Stack) => ConfigMap } = {
    [runtime.Type.AWS]: genPulumiConfigForAWS,
    [runtime.Type.K8s]: genPulumiConfigForK8s,
  };
  if (!(sta.runtime.type in genFnMapping)) {
    throw new Error("Not support this runtime.");
  }
  return genFnMapping[sta.runtime.type]!(sta);
}

function genPulumiConfigForAWS(sta: project.Stack): ConfigMap {
  const awsRt = sta.runtime as project.AwsRuntime;
  return {
    "aws:region": { value: awsRt.region },
    "aws:accessKey": { value: awsRt.accessKeyId },
    "aws:secretKey": { value: awsRt.secretAccessKey },
  };
}

function genPulumiConfigForK8s(sta: project.Stack): ConfigMap {
  const k8sRt = sta.runtime as project.K8sRuntime;
  return {
    "kubernetes:kubeconfig": { value: k8sRt.kubeConfigPath },
  };
}

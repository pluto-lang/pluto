import { loadSharedConfigFiles } from "@smithy/shared-ini-file-loader";

export async function getAwsRegion(): Promise<string | undefined> {
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

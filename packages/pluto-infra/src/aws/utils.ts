import * as pulumi from "@pulumi/pulumi";

export function currentAwsRegion(): string {
  const awsConfig = new pulumi.Config("aws");
  let region = awsConfig.get("region");
  if (region !== undefined) {
    return region;
  }

  region = process.env.AWS_REGION;
  if (region == undefined) {
    throw new Error("AWS_REGION is not defined");
  }
  return region;
}

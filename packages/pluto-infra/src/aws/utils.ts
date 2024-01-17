import { createHash } from "crypto";

const RESOURCE_NAME_MAX_LENGTH = 50;

export function currentAwsRegion(): string {
  const region = process.env.AWS_REGION;
  if (region == undefined) {
    throw new Error("AWS_REGION is not defined");
  }
  return region;
}

export function genAwsResourceName(...parts: string[]): string {
  const resourceFullId = parts.join("_").replace(/[^_0-9a-zA-Z]+/g, "_");
  if (resourceFullId.length <= RESOURCE_NAME_MAX_LENGTH) {
    return resourceFullId;
  } else {
    const hash = createHash("md5")
      .update(JSON.stringify(resourceFullId))
      .digest("hex")
      .substring(0, 8);
    return resourceFullId.substring(0, RESOURCE_NAME_MAX_LENGTH - hash.length) + hash;
  }
}

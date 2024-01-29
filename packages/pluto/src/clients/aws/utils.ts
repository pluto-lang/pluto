import { createHash } from "crypto";

const RESOURCE_NAME_MAX_LENGTH = 50;

export function genAwsResourceName(...parts: string[]): string {
  const resourceFullId = parts.join("_").replace(/[^_0-9a-zA-Z]+/g, "_");
  if (resourceFullId.length <= RESOURCE_NAME_MAX_LENGTH) {
    return resourceFullId;
  } else {
    const hash = createHash("md5")
      .update(JSON.stringify(resourceFullId))
      .digest("hex")
      .substring(0, 8);
    const start = resourceFullId.length - (RESOURCE_NAME_MAX_LENGTH - hash.length);
    const end = resourceFullId.length;
    return resourceFullId.substring(start, end) + hash;
  }
}

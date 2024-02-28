import { createHash } from "crypto";

const RESOURCE_NAME_MAX_LENGTH = 50;

export function genAwsResourceName(...parts: string[]): string {
  const resourceFullId = parts.join("_").replace(/[^-0-9a-zA-Z]+/g, "-");
  if (resourceFullId.length <= RESOURCE_NAME_MAX_LENGTH) {
    return resourceFullId.replace(/^-+|-+$/g, "");
  } else {
    const hash = createHash("md5")
      .update(JSON.stringify(resourceFullId))
      .digest("hex")
      .substring(0, 8);
    const start = resourceFullId.length - (RESOURCE_NAME_MAX_LENGTH - hash.length);
    const end = resourceFullId.length;
    return (resourceFullId.substring(start, end) + hash).replace(/^-+|-+$/g, "");
  }
}

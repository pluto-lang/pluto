import { createHash } from "crypto";

/**
 * The AppName for the ApiGateway has a character limit that falls between 4 and 26 characters.
 * https://api.aliyun.com/document/CloudAPI/2016-07-14/CreateApp
 */
const RESOURCE_NAME_MAX_LENGTH = 25;

export function genAliResourceName(...parts: string[]): string {
  const resourceFullId = parts
    .join("")
    .replace(/[^0-9a-zA-Z]+/g, "")
    .toLocaleLowerCase();

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

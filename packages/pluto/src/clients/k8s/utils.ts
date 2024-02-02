import { createHash } from "crypto";

const RESOURCE_NAME_MAX_LENGTH = 50;

interface GenK8sResourceNameOptions {
  readonly maxLength?: number;
}

export function genK8sResourceName(...parts: string[]): string;

export function genK8sResourceName(options: GenK8sResourceNameOptions, ...parts: string[]): string;

export function genK8sResourceName(...parts: any[]): string {
  if (parts.length === 0 || (parts.length === 1 && typeof parts[0] !== "string")) {
    throw new Error(`There must be at least one string to genK8sResourceName.`);
  }

  let maxLength = RESOURCE_NAME_MAX_LENGTH;
  if (typeof parts[0] === "object") {
    if ("maxLength" in parts[0]) {
      if (parts[0].maxLength < 7) {
        throw new Error(`maxLength must be greater than 7.`);
      }
      maxLength = parts[0].maxLength;
    }
  }

  let combined = parts
    .join("-")
    .replace(/[^-0-9a-zA-Z]+/g, "-")
    .toLowerCase();
  if (combined.length > maxLength) {
    // If the length exceeds the maximum limit, append a Hash string at the end, which will
    // subsequently be used to trim down the string.
    const hash = createHash("md5").update(JSON.stringify(combined)).digest("hex").substring(0, 8);
    combined = combined + "-" + hash;
  }
  // Trim the string to meet the maximum length requirement.
  const start = Math.max(0, combined.length - maxLength);
  const lengthValid = combined.substring(start, combined.length);
  // Eliminate the leading numbers and the short dashes at both ends.
  const formatValid = lengthValid.replaceAll(/^[-0-9]+|_+$/g, "");
  return formatValid;
}

import { createHash } from "crypto";
import { currentProjectName, currentStackName } from "./configuration";

const RESOURCE_ID_MAX_LENGTH = 64;

/**
 * Construct a string to serve as the resource ID. This is assembled using the project name, stack
 * name, type of resource, and the resource's own name.
 * @param project The project name.
 * @param stack The stack name.
 * @param resourceType The resource type is better to follow the format 'package_name.type_name', for instance, '@plutolang/pluto.Router'.
 * @param providedName The resource name provided by the user.
 * @returns The generated resource id, limited to 64 characters.
 */
export function genResourceId(
  project: string,
  stack: string,
  resourceType: string,
  providedName: string
): string;

/**
 * Construct a string to serve as the resource ID. This is assembled using the project name, stack name, type of resource, and the resource's own name. The project and stack names are automatically retrieved from global configurations.
 * @param resourceType The resource type is better to follow the format 'package_name.type_name', for instance, '@plutolang/pluto.Router'.
 * @param providedName The resource name provided by the user.
 * @returns The generated resource id, limited to 64 characters.
 */
export function genResourceId(resourceType: string, providedName: string): string;

export function genResourceId(...args: readonly string[]): string {
  if (args.length !== 2 && args.length !== 4) {
    throw new Error("Invalid arguments.");
  }
  if (args.length === 2) {
    args = [currentProjectName(), currentStackName()].concat(args);
  }

  const resourceFullId = args.join("_").replace(/[^_0-9a-zA-Z]+/g, "_");
  if (resourceFullId.length <= RESOURCE_ID_MAX_LENGTH) {
    return resourceFullId;
  } else {
    const hash = createHash("md5").update(resourceFullId).digest("hex").substring(0, 8);
    // Preserve the final segment of content, its length equals (RESOURCE_ID_MAX_LENGTH -
    // hash.length), then append the hash to it.
    const start = resourceFullId.length - (RESOURCE_ID_MAX_LENGTH - hash.length);
    const end = resourceFullId.length;
    return resourceFullId.substring(start, end) + hash;
  }
}

/**
 * Generate a string as the resource provisioned id on the platform.
 * @param project The project name.
 * @param stack The stack name.
 * @param resourceType The resource type.
 * @param providedName The resource name provided by the user.
 * @returns The generated resource id.
 */
export function genResourceId(
  project: string,
  stack: string,
  resourceType: string,
  providedName: string
): string {
  return `${project}_${stack}_${resourceType}_${providedName}`.replace(/[^_0-9a-zA-Z]+/g, "_");
}

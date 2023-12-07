/**
 * Generate a string as the resource provisioned id on the platform.
 * @param project The project name.
 * @param stack The stack name.
 * @param userProvided The resource name provided by the user.
 * @returns The generated resource id.
 */
export function genResourceId(project: string, stack: string, userProvided: string): string {
  return `${project}_${stack}_${userProvided}`.replaceAll(/[/\s]+/g, "");
}

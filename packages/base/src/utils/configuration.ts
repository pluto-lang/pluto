import { homedir } from "os";
import { join } from "path";

/**
 * Returns the path to the global configuration directory.
 */
export function systemConfigDir(): string {
  return join(homedir(), ".pluto");
}

export function currentProjectName(): string {
  const projectName = process.env["PLUTO_PROJECT_NAME"];
  if (!projectName) {
    throw new Error("The environment variable PLUTO_PROJECT_NAME is not set.");
  }
  return projectName;
}

export function currentStackName(): string {
  const stackName = process.env["PLUTO_STACK_NAME"];
  if (!stackName) {
    throw new Error("The environment variable PLUTO_STACK_NAME is not set.");
  }
  return stackName;
}

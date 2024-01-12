import { homedir } from "os";
import { join } from "path";
import { PlatformType } from "../platform";
import { isPlatformType } from "./platform";
import { ProvisionType } from "../provision";
import { isEngineType } from "./provision";

/**
 * Returns the path to the global configuration directory.
 */
export function systemConfigDir(): string {
  return join(homedir(), ".pluto");
}

export const currentProjectName = () => fetchEnvWithThrow("PLUTO_PROJECT_NAME");
export const currentStackName = () => fetchEnvWithThrow("PLUTO_STACK_NAME");

export function currentPlatformType(): PlatformType {
  const val = fetchEnvWithThrow("PLUTO_PLATFORM_TYPE");
  if (isPlatformType(val)) {
    return val;
  }
  throw new Error(`The '${val}' is not a valid platform type.`);
}

export function currentEngineType(): ProvisionType {
  const val = fetchEnvWithThrow("PLUTO_PROVISION_TYPE");
  if (isEngineType(val)) {
    return val;
  }
  throw new Error(`The '${val}' is not a valid provisioning engine type.`);
}

function fetchEnvWithThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`The environment variable ${name} is not set.`);
  }
  return value;
}

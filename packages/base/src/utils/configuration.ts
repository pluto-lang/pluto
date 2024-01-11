import { homedir } from "os";
import { join } from "path";
import * as engine from "../engine";
import * as runtime from "../runtime";

/**
 * Returns the path to the global configuration directory.
 */
export function systemConfigDir(): string {
  return join(homedir(), ".pluto");
}

export const currentProjectName = () => fetchEnvWithThrow("PLUTO_PROJECT_NAME");
export const currentStackName = () => fetchEnvWithThrow("PLUTO_STACK_NAME");

export function currentPlatformType(): runtime.Type {
  const val = fetchEnvWithThrow("RUNTIME_TYPE");
  if (runtime.isRuntimeType(val)) {
    return val;
  }
  throw new Error(`The '${val}' is not a valid platform type.`);
}

export function currentEngineType(): engine.Type {
  const val = fetchEnvWithThrow("ENGINE_TYPE");
  if (engine.isEngineType(val)) {
    return val;
  }
  throw new Error(`The '${val}' is not a valid engine type.`);
}

function fetchEnvWithThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`The environment variable ${name} is not set.`);
  }
  return value;
}

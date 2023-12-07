import { homedir } from "os";
import { join } from "path";

/**
 * Returns the path to the global configuration directory.
 */
export function systemConfigDir(): string {
  return join(homedir(), ".pluto");
}

import { readdirSync } from "fs";
import { resolve } from "path";

/* @internal */
export function updateInProgress(projectName: string, stackName: string, workDir: string): boolean {
  const locksDir = resolve(workDir, ".pulumi/locks/organization", projectName, stackName);
  const files = readdirSync(locksDir);
  return files.length > 0;
}

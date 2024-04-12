import { execSync } from "child_process";

export function getDefaultPythonRuntime(): string {
  try {
    const output = execSync("python3 --version");
    const version = output.toString().replace("Python ", "").trim();
    const mainVersion = version.split(".").slice(0, 2).join(".");
    return `python${mainVersion}`;
  } catch (error) {
    throw new Error("Python 3 is not installed");
  }
}

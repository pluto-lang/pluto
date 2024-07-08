import spawn from "cross-spawn";
import { quote } from "shell-quote";
import { Runtime } from "./types";

/**
 * Merge multiple commands into a single command.
 */
export function mergeCommands(commands: string[][]) {
  const cmds = commands.filter((cmd) => cmd.length > 0);
  if (cmds.length === 0) {
    throw new Error("Expected at least one non-empty command");
  } else if (cmds.length === 1) {
    return cmds[0];
  } else {
    // Quote the arguments in each command and join them all using &&.
    const script = cmds.map(quote).join(" && ");
    return ["/bin/sh", "-c", script];
  }
}

/**
 * Execute a command and return the output asynchronously.
 * @param cmd The command to execute.
 * @param args The arguments to pass to the command.
 * @returns A promise that resolves with the output of the command.
 */
export function runCommand(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(cmd, args);

    let stdout = "";
    let stderr = "";

    process.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (status) => {
      if (status === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with status ${status}, stderr: ${stderr}`));
      }
    });

    process.on("error", (e) => {
      if (e.message && e.message.includes("command not found")) {
        reject(new Error(`${cmd} is not installed. Please install it to continue.`));
      } else {
        reject(e);
      }
    });
  });
}

/**
 * Check if a command exists.
 */
export async function existCommand(cmd: string) {
  try {
    await runCommand("which", [cmd]);
    return true;
  } catch (e) {
    return false;
  }
}

export async function getDefaultPythonRuntime(): Promise<Runtime> {
  let output: string;
  try {
    output = await runCommand("python3", ["--version"]);
  } catch (error) {
    throw new Error("Python 3 is not installed");
  }

  const version = output.toString().replace("Python ", "").trim();
  const subVersion = version.split(".")[1];
  if (parseInt(subVersion) < 8 || parseInt(subVersion) > 12) {
    throw new Error("Python 3.8 - 3.12 is required");
  }

  const mainVersion = version.split(".").slice(0, 2).join(".");
  return `python${mainVersion}` as Runtime;
}

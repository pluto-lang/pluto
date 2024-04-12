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
 * Execute a command and return the output.
 * @param cmd The command to execute.
 * @param args The arguments to pass to the command.
 * @returns The output of the command.
 */
export function runCommand(cmd: string, args: string[]) {
  try {
    const result = spawn.sync(cmd, args, { encoding: "utf-8" });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(`Command failed with status ${result.status}, stderr: ${result.stderr}`);
    }

    return result.stdout;
  } catch (e: any) {
    if (
      (e.code && e.code === "ENOENT") ||
      (e instanceof Error && e.message.includes("command not found"))
    ) {
      throw new Error(cmd + " is not installed. Please install it to continue.");
    }
    throw e;
  }
}

/**
 * Check if a command exists.
 */
export function existCommand(cmd: string) {
  try {
    runCommand("which", [cmd]);
    return true;
  } catch (e) {
    return false;
  }
}

export function getDefaultPythonRuntime(): Runtime {
  let output: string;
  try {
    output = runCommand("python3", ["--version"]);
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

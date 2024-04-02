import * as path from "path";
import * as fs from "fs-extra";
import { PlatformType } from "@plutolang/base";
import { systemConfigDir } from "@plutolang/base/utils";
import * as SlimUtils from "./slim";
import * as AwsUtils from "./aws-utils";
import * as CmdUtils from "./command-utils";
import * as MetadataUtils from "./metadata";
import { Architecture, Module, Runtime } from "./types";

export interface BundleModulesOptions {
  dockerPip?: boolean;
  platform?: PlatformType;
  slim?: boolean;
  uselessFilesPatterns?: string[];
  cache?: boolean;
}

export async function bundleModules(
  runtime: Runtime,
  architecture: Architecture,
  modules: readonly Module[],
  targetFolder: string,
  options: BundleModulesOptions = {}
): Promise<void> {
  if (!path.isAbsolute(targetFolder)) {
    targetFolder = path.resolve(targetFolder);
  }

  // When running on non-Linux platforms or packaging for cross-architecture, the Docker is
  // required. If the user has explicitly disabled Docker, throw an error.
  const currentArch = process.arch === "x64" ? "x86_64" : process.arch;
  if (process.platform !== "linux" || currentArch !== architecture) {
    if (options.dockerPip === false) {
      throw new Error(
        "Docker is required to bundle modules on non-Linux platforms, or for cross-architecture."
      );
    }
    options.dockerPip = true;
  }

  if (!options.dockerPip && !(await CmdUtils.existCommand(runtime))) {
    // The Python runtime isn't installed, and the user hasn't enabled Docker. Throw an error.
    throw new Error(
      `${runtime} is not installed. Please install it first, or use Docker to bundle modules instead.`
    );
  }

  if (options.cache === undefined) {
    // Enable caching by default.
    options.cache = true;
  }

  const currentMeta = { runtime, architecture, platform: options.platform, modules, done: false };
  if (!hasChanges(targetFolder, currentMeta)) {
    // If there are no changes, skip the installation.
    return;
  }

  // Generate requirements.txt file in the target folder.
  fs.removeSync(targetFolder);
  fs.ensureDirSync(targetFolder);
  generateRequirements(modules, targetFolder);
  MetadataUtils.dumpMetaFile(targetFolder, currentMeta);

  const hostCacheDir = await getCacheDir();
  const cacheDir = options.dockerPip ? "/var/pipCache" : hostCacheDir;
  const workDir = options.dockerPip ? "/var/task" : targetFolder;

  let commands: string[][] = [];
  commands.push(
    getPipInstallCommand(runtime, workDir, `${workDir}/requirements.txt`, !!options.cache, cacheDir)
  );

  if (options.slim) {
    // If slimming is enabled, strip the ".so" files to reduce the size.
    commands.push(SlimUtils.getStripCommand(workDir));
  }

  if (options.dockerPip) {
    // If Docker is enabled, run the commands inside a Docker container.
    const bindPaths: [string, string][] = [[targetFolder, workDir]];
    if (options.cache) {
      bindPaths.push([hostCacheDir, cacheDir]);
    }

    const imageUri = getBaseImageUri(runtime, architecture, options.platform);
    const dockerCmd = getDockerRunCommand(imageUri, bindPaths, commands);
    commands = [dockerCmd]; // Replace the commands with the Docker run command.
  }

  // Run the commands.
  for (const cmd of commands) {
    await CmdUtils.runCommand(cmd[0], cmd.slice(1));
  }

  if (options.slim) {
    // If slimming is enabled, remove the useless files, including the *.pyc, dist-info,
    // __pycache__, and etc.
    SlimUtils.removeUselessFiles(targetFolder, options.uselessFilesPatterns);
  }

  // Mark the installation as done. This is used to skip the installation if the metadata hasn't
  // changed.
  currentMeta.done = true;
  MetadataUtils.dumpMetaFile(targetFolder, currentMeta);
}

function hasChanges(targetFolder: string, meta: MetadataUtils.Metadata) {
  const lastMeta = MetadataUtils.loadMetaFile(targetFolder);
  if (lastMeta && MetadataUtils.sameMetadata(meta, lastMeta)) {
    // If the metadata is the same as the last time, skip the installation.
    return false;
  }
  return true;
}

function getBaseImageUri(
  runtime: Runtime,
  architecture: Architecture,
  platform?: PlatformType
): string {
  switch (platform) {
    case PlatformType.AWS:
    default:
      return AwsUtils.baseImageUri(runtime, architecture);
  }
}

/**
 * Construct a Docker run command to run the given image with the specified bind paths and commands.
 * @param imageUri The URI of the Docker image to run.
 * @param bindPaths The list of host and container paths to bind mount.
 * @param commands The list of commands to run inside the container.
 */
function getDockerRunCommand(
  imageUri: string,
  bindPaths: [string, string][],
  commands: string[][]
): string[] {
  const dockerCmd = ["docker", "run", "--rm"];
  for (const [hostPath, containerPath] of bindPaths) {
    dockerCmd.push("-v", `${hostPath}:${containerPath}:z`);
  }
  dockerCmd.push(imageUri, ...CmdUtils.mergeCommands(commands));
  return dockerCmd;
}

async function getCacheDir() {
  let cacheDir: string;
  try {
    // Get the pip cache directory using the `pip cache dir` command.
    cacheDir = (await CmdUtils.runCommand("pip", ["cache", "dir"])).trim();
  } catch (e) {
    cacheDir = path.join(systemConfigDir(), "caches", "pyright-deducer", "pip");
  }
  fs.ensureDirSync(cacheDir);
  return cacheDir;
}

function getPipInstallCommand(
  pythonBin: string,
  targetFolder: string,
  requirementsPath: string,
  enableCache: boolean,
  cacheDir: string
): string[] {
  const pipCmd = [pythonBin, "-m", "pip", "install", "-t", targetFolder, "-r", requirementsPath];
  if (enableCache) {
    pipCmd.push("--cache-dir", cacheDir);
  } else {
    pipCmd.push("--no-cache-dir");
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone === "Asia/Shanghai") {
    pipCmd.push(...["-i", "https://pypi.tuna.tsinghua.edu.cn/simple"]);
  }
  return pipCmd;
}

/**
 * Generate a requirements.txt file in the target folder.
 */
function generateRequirements(modules: readonly Module[], targetFolder: string) {
  const requirements = modules
    .map((m) => {
      if (m.version) {
        return `${m.name}==${m.version}`;
      }
      return m.name;
    })
    .join("\n");

  fs.writeFileSync(`${targetFolder}/requirements.txt`, requirements);
}

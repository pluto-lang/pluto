import * as path from "path";
import * as fs from "fs-extra";
import { PlatformType } from "@plutolang/base";
import { systemConfigDir } from "@plutolang/base/utils";
import * as SlimUtils from "./slim";
import * as AwsUtils from "./aws-utils";
import * as CmdUtils from "./command-utils";
import * as MetadataUtils from "./metadata";
import { getIndexUrls, IndexUrl } from "./index-url";
import { Architecture, InstalledModule, Module, ModuleType, Runtime } from "./types";

export interface BundleModulesOptions {
  /**
   * Whether to install the modules. If false, the installation is skipped. @default true
   */
  install?: boolean;
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
  bundleDir: string,
  sitePackagesDir: string,
  options: BundleModulesOptions = {}
): Promise<void> {
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

  // Copy the local packages to the target folder.
  await copyLocalModules(modules, bundleDir);
  await generateRequirements(modules, bundleDir);

  const currentMeta = { runtime, architecture, platform: options.platform, modules, done: false };
  if (isCompleted(sitePackagesDir, currentMeta)) {
    // If the installation is already done, skip it.
    return;
  }

  if (options.install !== false) {
    // Clean the target folder and dump the metadata file.
    fs.removeSync(sitePackagesDir);
    fs.ensureDirSync(sitePackagesDir);
    MetadataUtils.dumpMetaFile(sitePackagesDir, currentMeta);

    // Install the installable modules.
    await installModules(modules, sitePackagesDir, runtime, architecture, options);

    // Mark the installation as done. This is used to skip the installation if the metadata hasn't
    // changed.
    currentMeta.done = true;
    MetadataUtils.dumpMetaFile(sitePackagesDir, currentMeta);
  }
}

async function copyLocalModules(modules: readonly Module[], bundleDir: string) {
  for (const module of modules) {
    if (ModuleType.Local !== module.type) {
      // Skip the installable modules.
      continue;
    }

    const suffix = (await fs.stat(module.modulePath)).isFile() ? ".py" : "";
    const destDir = path.join(bundleDir, module.name) + suffix;
    await fs.copy(module.modulePath, destDir);
  }
}

async function installModules(
  modules: readonly Module[],
  targetFolder: string,
  runtime: Runtime,
  architecture: Architecture,
  options: BundleModulesOptions
) {
  // Generate requirements.txt file in the target folder.
  await generateRequirements(modules, targetFolder);

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
}

function isCompleted(targetFolder: string, meta: MetadataUtils.Metadata) {
  const lastMeta = MetadataUtils.loadMetaFile(targetFolder);
  if (
    lastMeta &&
    lastMeta.done &&
    MetadataUtils.sameMetadata(meta, lastMeta, /* caredType */ ModuleType.Installed)
  ) {
    // If the metadata is the same as the last time, and the installation is done, skip it.
    return true;
  }
  return false;
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
  cacheDir: string,
  indexUrls?: IndexUrl[]
): string[] {
  const pipCmd = [pythonBin, "-m", "pip", "install", "-t", targetFolder, "-r", requirementsPath];

  indexUrls?.forEach((indexUrl) => {
    if (indexUrl.primary) {
      pipCmd.push("--index-url", indexUrl.url);
    } else {
      pipCmd.push("--extra-index-url", indexUrl.url);
    }
  });

  if (enableCache) {
    pipCmd.push("--cache-dir", cacheDir);
  } else {
    pipCmd.push("--no-cache-dir");
  }

  return pipCmd;
}

/**
 * Generate a requirements.txt file in the target folder.
 */
async function generateRequirements(modules: readonly Module[], targetFolder: string) {
  const indexUrls = await getIndexUrls();
  const indexUrlLines = indexUrls
    .map((indexUrl) => {
      return indexUrl.primary ? `--index-url ${indexUrl.url}` : `--extra-index-url ${indexUrl.url}`;
    })
    .join("\n");

  const requiredModules = modules
    .filter<InstalledModule>((m): m is InstalledModule => ModuleType.Installed === m.type)
    .map((m) => {
      if (m.version) {
        return `${m.name}==${m.version}`;
      }
      return m.name;
    })
    .join("\n");

  await fs.writeFile(`${targetFolder}/requirements.txt`, `${indexUrlLines}\n${requiredModules}`);
}

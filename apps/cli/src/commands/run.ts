import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import { Mutex } from "async-mutex";
import { PlatformType, ProvisionType, config, core } from "@plutolang/base";
import logger from "../log";
import { prepareStackDirs } from "../utils";
import { loadDotEnvs } from "./env";
import { loadAndDeduce } from "./compile";
import { deployWithAdapter } from "./deploy";
import {
  buildAdapterByProvisionType,
  getDefaultDeducerPkg,
  getDefaultEntrypoint,
  loadProjectAndStack,
  loadProjectRoot,
} from "./utils";

export interface RunOptions {
  live: boolean;
}

let adapter: core.Adapter | undefined;
const mutex = new Mutex();

export async function run(entrypoint: string, options: RunOptions) {
  const projectRoot = loadProjectRoot();
  const { project } = loadProjectAndStack(projectRoot);
  const stack = new config.Stack("local_run", PlatformType.Simulator, ProvisionType.Simulator);

  // Load the environment variables from the `.env` files.
  loadDotEnvs(projectRoot, stack.name, false);

  // Ensure the entrypoint exist.
  entrypoint = entrypoint ?? getDefaultEntrypoint(project.language);
  if (!fs.existsSync(entrypoint)) {
    throw new Error(`No such file, ${entrypoint}`);
  }

  if (options.live) {
    watchFiles(project, stack, entrypoint);
  }
  await mutex.runExclusive(async () => executeOnce(project, stack, entrypoint));
}

async function executeOnce(project: config.Project, stack: config.Stack, entrypoint: string) {
  // If there is a running adapter, destroy it.
  await adapter?.destroy();
  adapter = undefined;

  // Prepare the directories for the stack.
  const { closuresDir, baseDir, stateDir } = await prepareStackDirs(project.rootpath, stack.name);

  // construct the arch ref from user code
  logger.info("Generating reference architecture...");
  const { archRef } = await loadAndDeduce(
    getDefaultDeducerPkg(project.language),
    {
      project: project.name,
      stack: stack,
      rootpath: project.rootpath,
      closureDir: closuresDir,
    },
    [entrypoint]
  );

  const archRefFile = path.join(baseDir, "arch.yml");
  fs.writeFileSync(archRefFile, archRef.toYaml());

  // Build the adapter and deploy the stack.
  adapter = await buildAdapterByProvisionType(stack.provisionType, {
    project: project.name,
    rootpath: project.rootpath,
    language: project.language,
    stack: stack,
    archRef: archRef,
    entrypoint: "",
    stateDir: stateDir,
  });
  await deployWithAdapter(adapter, stack);
}

async function watchFiles(project: config.Project, stack: config.Stack, entrypoint: string) {
  const initialFiles = new Set<string>();
  const recordInitialFiles = (dir: string) => {
    // Record all files in the directory.
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isFile()) {
        initialFiles.add(filePath);
      } else if (fs.statSync(filePath).isDirectory()) {
        recordInitialFiles(filePath); // Recursively record files in subdirectories
      }
    });
  };

  const handler = async (path: string, eventType: string) => {
    if (!/\.py$|\.ts$/.test(path)) {
      return;
    }

    if (initialFiles.has(path)) {
      // Ignore the initial events.
      initialFiles.delete(path);
      return;
    }

    logger.debug(`Received ${eventType} event for ${path}`);
    await mutex.runExclusive(async () => executeOnce(project, stack, entrypoint));
  };

  const dirpath = path.dirname(entrypoint);
  recordInitialFiles(dirpath);

  const watcher = chokidar.watch(dirpath, { persistent: true });
  watcher.on("change", async (path) => handler(path, "change"));
  watcher.on("add", async (path) => handler(path, "add"));
  watcher.on("unlink", async (path) => handler(path, "unlink"));
}

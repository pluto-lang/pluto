import fs from "fs";
import path from "path";
import { PlatformType, ProvisionType, config } from "@plutolang/base";
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

export interface RunOptions {}

export async function run(entrypoint: string) {
  const projectRoot = loadProjectRoot();
  const { project } = loadProjectAndStack(projectRoot);
  const stack = new config.Stack("local_run", PlatformType.Simulator, ProvisionType.Simulator);

  // Load the environment variables from the `.env` files.
  loadDotEnvs(projectRoot, stack.name, false);

  // Prepare the directories for the stack.
  const { closuresDir, baseDir, stateDir } = await prepareStackDirs(projectRoot, stack.name);

  // Ensure the entrypoint exist.
  entrypoint = entrypoint ?? getDefaultEntrypoint(project.language);
  if (!fs.existsSync(entrypoint)) {
    throw new Error(`No such file, ${entrypoint}`);
  }

  // construct the arch ref from user code
  logger.info("Generating reference architecture...");
  const { archRef } = await loadAndDeduce(
    getDefaultDeducerPkg(project.language),
    {
      project: project.name,
      stack: stack,
      rootpath: projectRoot,
      closureDir: closuresDir,
    },
    [entrypoint]
  );

  const archRefFile = path.join(baseDir, "arch.yml");
  fs.writeFileSync(archRefFile, archRef.toYaml());

  // Build the adapter and deploy the stack.
  const adapter = await buildAdapterByProvisionType(stack.provisionType, {
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

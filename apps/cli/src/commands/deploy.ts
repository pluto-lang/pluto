import path from "path";
import { project } from "@pluto/base";
import { BuildAdapterByEngine } from "@pluto/adapters";
import logger from "../log";
import { loadConfig } from "../utils";
import { loadAndDeduce, loadAndGenerate } from "./compile";

export interface DeployOptions {
  stack?: string;
  deducer: string;
  generator: string;
}

export async function deploy(files: string[], opts: DeployOptions) {
  // If the user only privides one file, change the variable to an array.
  if (typeof files === "string") {
    files = [files];
  }

  const proj = loadConfig();

  let sta: project.Stack | undefined;
  if (opts.stack) {
    sta = proj.getStack(opts.stack);
    if (!sta) {
      logger.error("No such stack.");
      process.exit(1);
    }
  } else {
    sta = proj.getStack(proj.current);
    if (!sta) {
      logger.error("There is not existing stack. Please create a new one first.");
      process.exit(1);
    }
  }

  // construct the arch ref from user code
  logger.info("Deducing...");
  const archRef = await loadAndDeduce(opts.deducer, files);

  // generate the IR code based on the arch ref
  logger.info("Generating...");
  const outdir = path.join(".pluto", sta.name);
  const entrypointFile = await loadAndGenerate(opts.generator, archRef, outdir);
  if (process.env.DEBUG) {
    logger.debug("Entrypoint file: ", entrypointFile);
  }

  // build the adapter based on the engine type
  const adpt = BuildAdapterByEngine(sta.engine);
  if (!adpt) {
    logger.error("No such engine.");
    process.exit(1);
  }

  logger.info("Applying...");
  const applyResult = await adpt.apply({
    projName: proj.name,
    stack: sta,
    entrypoint: entrypointFile,
  });
  if (applyResult.error) {
    logger.error(applyResult.error);
    process.exit(1);
  }

  logger.info("Successfully applied!");
  for (let key in applyResult.outputs) {
    logger.info(`${key}: ${applyResult.outputs[key]}`);
  }
}

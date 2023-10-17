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
  const archRef = await loadAndDeduce(opts.deducer, files);

  // generate the IR code based on the arch ref
  const outdir = path.join(".pluto", sta.name);
  await loadAndGenerate(opts.generator, archRef, outdir);

  await apply(proj.name, sta, ".pluto/dev/pir-pulumi.js");
}

async function apply(projName: string, sta: project.Stack, entrypoint: string) {
  const adpt = BuildAdapterByEngine(sta.engine);
  await adpt.apply({ projName: projName, stack: sta, entrypoint: entrypoint });
}

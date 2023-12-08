import path from "path";
import { project } from "@plutolang/base";
import { BuildAdapterByEngine } from "@plutolang/adapters";
import logger from "../log";
import { loadConfig } from "../utils";
import { loadArchRef } from "./utils";

export interface DestoryOptions {
  stack?: string;
}

export async function destroy(opts: DestoryOptions) {
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
  if (!sta.adapter) {
    throw new Error("Please deploy first.");
  }
  const archRef = loadArchRef(`.pluto/${sta.name}/arch.yml`);

  // build the adapter based on the engine type
  const adpt = BuildAdapterByEngine(sta.engine, {
    project: proj.name,
    stack: sta,
    rootpath: path.resolve("."),
    entrypoint: sta.adapter.entrypoint,
    workdir: sta.adapter.workdir,
    archRef: archRef,
  });
  if (!adpt) {
    logger.error("No such engine.");
    process.exit(1);
  }

  try {
    logger.info("Destroying...");
    await adpt.destroy();
    logger.info("Successfully destroyed!");
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
    } else {
      logger.error(e);
    }
    process.exit(1);
  }
}

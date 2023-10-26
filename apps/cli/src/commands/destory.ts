import { project } from "@plutolang/base";
import { BuildAdapterByEngine } from "@plutolang/adapters";
import logger from "../log";
import { loadConfig } from "../utils";

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

  // build the adapter based on the engine type
  const adpt = BuildAdapterByEngine(sta.engine);
  if (!adpt) {
    logger.error("No such engine.");
    process.exit(1);
  }

  logger.info("Destroying...");
  const destroyResult = await adpt.destroy({
    projName: proj.name,
    stack: sta,
  });
  if (destroyResult.error) {
    logger.error(destroyResult.error);
    process.exit(1);
  }

  logger.info("Successfully destroyed!");
}

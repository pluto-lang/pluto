import logger from "../log";
import {
  buildAdapterByProvisionType,
  loadArchRef,
  loadProjectAndStack,
  loadProjectRoot,
  stackStateFile,
} from "./utils";
import { dumpStackState, getStackBasicDirs } from "../utils";
import { loadDotEnvs } from "./env";

export interface DestoryOptions {
  stack?: string;
  force: boolean;
}

export async function destroy(opts: DestoryOptions) {
  try {
    const projectRoot = loadProjectRoot();
    const { project, stack } = loadProjectAndStack(projectRoot, opts.stack);

    // Load the environment variables from the `.env` files.
    loadDotEnvs(projectRoot, stack.name, false);

    if (!stack.archRefFile || !stack.provisionFile) {
      throw new Error(
        "The stack is missing an architecture reference file and a provision file. Please execute the `pluto deploy` command again before proceeding with the destruction."
      );
    }

    const { stateDir } = getStackBasicDirs(projectRoot, stack.name);

    const adapter = await buildAdapterByProvisionType(stack.provisionType, {
      project: project.name,
      rootpath: project.rootpath,
      language: project.language,
      stack: stack,
      archRef: loadArchRef(stack.archRefFile),
      entrypoint: stack.provisionFile,
      stateDir: stateDir,
    });

    logger.info("Destroying...");
    await adapter.destroy({ force: opts.force });
    stack.setUndeployed();
    dumpStackState(stackStateFile(stateDir), stack.state);
    logger.info("Successfully destroyed!");
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
      if (process.env.DEBUG) {
        logger.error(e.stack);
      }
    } else {
      logger.error(e);
    }
    process.exit(1);
  }
}

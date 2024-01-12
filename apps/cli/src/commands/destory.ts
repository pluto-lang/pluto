import path from "path";
import logger from "../log";
import { buildAdapter, loadArchRef, selectAdapterByEngine } from "./utils";
import { PLUTO_PROJECT_OUTPUT_DIR, dumpProject, isPlutoProject, loadProject } from "../utils";

export interface DestoryOptions {
  stack?: string;
  clean?: boolean;
}

export async function destroy(opts: DestoryOptions) {
  const projectRoot = path.resolve("./");
  if (!isPlutoProject(projectRoot)) {
    logger.error("The current location is not located at the root of a Pluto project.");
    process.exit(1);
  }
  const proj = loadProject(projectRoot);

  const stackName = opts.stack ?? proj.current;
  if (!stackName) {
    logger.error(
      "There isn't a default stack. Please use the --stack option to specify which stack you want."
    );
    process.exit(1);
  }

  const stack = proj.getStack(stackName);
  if (!stack) {
    logger.error(`There is no stack named ${stackName}.`);
    process.exit(1);
  }

  // If the user sets the --clean option, there is no need for us to check if the stack has been deployed.
  // We will clean up all the resources that have been created, even if the stack has not been deployed.
  if (!opts.clean && !stack.isDeployed()) {
    logger.error("This stack hasn't been deployed yet. Please deploy it first.");
    process.exit(1);
  }

  if (!stack.archRefFile || !stack.provisionFile) {
    logger.error(
      "There are some configurations missing in this stack. You can try redeploying the stack and give it another go."
    );
    process.exit(1);
  }

  const stackBaseDir = path.join(projectRoot, PLUTO_PROJECT_OUTPUT_DIR, stackName);
  const generatedDir = path.join(stackBaseDir, "generated");
  // TODO: make the workdir same with generated dir.
  const workdir = path.join(generatedDir, `compiled`);

  // build the adapter based on the provisioning engine type
  const adapterPkg = selectAdapterByEngine(stack.provisionType);
  if (!adapterPkg) {
    logger.error(`There is no adapter for type ${stack.provisionType}.`);
    process.exit(1);
  }
  const adapter = await buildAdapter(adapterPkg, {
    project: proj.name,
    rootpath: projectRoot,
    stack: stack,
    archRef: loadArchRef(stack.archRefFile),
    entrypoint: stack.provisionFile,
    workdir: workdir,
  });
  if (!adapter) {
    logger.error(`There is no engine of type ${stack.provisionType}.`);
    process.exit(1);
  }
  if (stack.adapterState) {
    adapter.load(stack.adapterState);
  }

  try {
    logger.info("Destroying...");
    await adapter.destroy();
    stack.setUndeployed();
    dumpProject(proj);
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

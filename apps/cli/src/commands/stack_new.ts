import { ProvisionType, PlatformType } from "@plutolang/base";
import { createStack } from "../builder";
import logger from "../log";
import { dumpProject, isPlutoProject, loadProject } from "../utils";
import { resolve } from "path";

interface NewOptions {
  name?: string;
  platform?: PlatformType;
  provision?: ProvisionType;
}

export async function newStack(opts: NewOptions) {
  if (!isPlutoProject(resolve("./"))) {
    logger.error("The current location is not located at the root of a Pluto project.");
    process.exit(1);
  }
  const proj = loadProject(resolve("./"));

  const sta = await createStack({
    name: opts.name,
    platformType: opts.platform,
    provisionType: opts.provision,
  });
  proj.addStack(sta);
  dumpProject(proj);
  logger.info("Created a stack.");
}

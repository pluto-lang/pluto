import { engine, runtime } from "@pluto/base";
import { createStack } from "../builder";
import { loadConfig, saveConfig } from "../utils";
import logger from "../log";

interface NewOptions {
  name?: string;
  platform?: runtime.Type;
  engine?: engine.Type;
}

export async function newStack(opts: NewOptions) {
  const sta = await createStack({ name: opts.name, rtType: opts.platform, engType: opts.engine });
  const proj = loadConfig();
  proj.addStack(sta);
  saveConfig(proj);
  logger.info("Created a stack.");
}

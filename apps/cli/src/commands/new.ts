import { engine, runtime } from "@pluto/base";
import { createProject } from "../builder";
import { saveConfig } from "../utils";

interface NewOptions {
  name?: string;
  stack?: string;
  platform?: runtime.Type;
  engine?: engine.Type;
}

export async function create(opts: NewOptions) {
  const proj = await createProject({
    name: opts.name,
    stack: opts.stack,
    rtType: opts.platform,
    engType: opts.engine,
  });

  console.log(proj);
  saveConfig(proj, proj.name);
}

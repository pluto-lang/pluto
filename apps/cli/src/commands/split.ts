import fs from "fs";
import path from "path";
import { LanguageType, PlatformType, ProvisionType, config, core } from "@plutolang/base";
import logger from "../log";
import { loadAndDeduce } from "./compile";
import { getDefaultDeducerPkg } from "./utils";

export interface SplitOptions {
  outdir?: string;
}

export async function split(entrypoint: string, opts: SplitOptions) {
  if (entrypoint === undefined) {
    logger.error("No entrypoint specified.");
    process.exit(1);
  }
  entrypoint = path.resolve(process.cwd(), entrypoint);

  const stack = new config.Stack("temp", PlatformType.Custom, ProvisionType.Custom);
  stack.configs = {
    bundleWithDependencies: false,
    entrypoint: "main.main",
    codebase: path.dirname(entrypoint),
  };

  const basicArgs: core.BasicArgs = {
    project: "temp",
    stack: stack,
    rootpath: path.dirname(entrypoint),
  };

  const closureDir = opts.outdir ?? path.join(process.cwd(), "output");
  fs.rmSync(closureDir, { recursive: true, force: true });

  await loadAndDeduce(
    getDefaultDeducerPkg(LanguageType.Python),
    {
      ...basicArgs,
      closureDir,
    },
    [entrypoint]
  );

  // Remove the redundant part of the file name.
  const directories = fs.readdirSync(closureDir);
  for (const dir of directories) {
    const result = /temp_temp__plutolang_pluto_Function_(.*)_constructor/g.exec(dir);
    if (!result) {
      continue;
    }
    const name = result[1];
    fs.renameSync(path.join(closureDir, dir), path.join(closureDir, `${name}`));
  }
}

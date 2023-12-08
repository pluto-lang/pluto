import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import { arch, core } from "@plutolang/base";
import logger from "../log";
import { loadConfig } from "../utils";
import { loadPackage } from "./utils";

const GRAPHVIZ_GENERATOR_PKG = "@plutolang/graphviz-generator";

export interface CompileOptions {
  stack?: string;
  deducer: string;
  generator: string;
}

export async function compile(entrypoint: string, opts: CompileOptions) {
  // Ensure the entrypoint exist.
  if (!fs.existsSync(entrypoint)) {
    throw new Error(`No such file, ${entrypoint}`);
  }

  // get current stack, and set the output directory
  const proj = loadConfig();
  const sta = proj.getStack(proj.current);
  if (!sta) {
    logger.error("There is not existing stack. Please create a new one first.");
    process.exit(1);
  }
  const outdir = path.join(".pluto", sta.name);

  const basicArgs: core.BasicArgs = {
    project: proj.name,
    stack: sta,
    rootpath: path.resolve("."),
  };

  // construct the arch ref from user code
  const { archRef } = await loadAndDeduce(opts.deducer, basicArgs, [entrypoint]);
  const yamlText = yaml.dump(archRef, { noRefs: true });
  fs.writeFileSync(path.join(outdir, "arch.yml"), yamlText);

  // generate the graphviz file
  await loadAndGenerate(GRAPHVIZ_GENERATOR_PKG, basicArgs, archRef, outdir);

  // generate the IR code based on the arch ref
  await loadAndGenerate(opts.generator, basicArgs, archRef, outdir);
}

export async function loadAndDeduce(
  deducerName: string,
  basicArgs: core.BasicArgs,
  files: string[]
): Promise<core.DeduceResult> {
  // try to construct the deducer, exit with error if failed to import
  try {
    const deducer: core.Deducer = new (await loadPackage(deducerName))(basicArgs);
    return await deducer.deduce(files);
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err.message);
    } else {
      logger.error(err);
    }
    process.exit(1);
  }
}

export async function loadAndGenerate(
  generatorName: string,
  basicArgs: core.BasicArgs,
  archRef: arch.Architecture,
  outdir: string
): Promise<core.GenerateResult> {
  // try to construct the generator, exit with error if failed to import
  try {
    const generator: core.Generator = new (await loadPackage(generatorName))(basicArgs);
    return await generator.generate(archRef, outdir);
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err.message);
    } else {
      logger.error(err);
    }
    process.exit(1);
  }
}

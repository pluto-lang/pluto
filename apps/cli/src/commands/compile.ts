import fs from "fs";
import path from "path";
import { arch } from "@pluto/base";
import logger from "../log";
import { loadConfig } from "../utils";

export interface CompileOptions {
  stack?: string;
  deducer: string;
  generator: string;
}

export async function compile(files: string[], opts: CompileOptions) {
  // If the user only privides one file, change the variable to an array.
  if (typeof files === "string") {
    files = [files];
  }

  // Ensure all the provided files exist.
  files.forEach((file) => {
    if (!fs.existsSync(file)) {
      throw new Error("Not all files exist.");
    }
  });

  // construct the arch ref from user code
  const archRef = await loadAndDeduce(opts.deducer, files);

  // generate the IR code based on the arch ref
  const proj = loadConfig();
  const sta = proj.getStack(proj.current);
  if (!sta) {
    logger.error("There is not existing stack. Please create a new one first.");
    process.exit(1);
  }
  const outdir = path.join(".pluto", sta.name);
  await loadAndGenerate(opts.generator, archRef, outdir);
}

export async function loadAndDeduce(
  deducerName: string,
  files: string[]
): Promise<arch.Architecture> {
  // try to construct the deducer, exit with error if failed to import
  try {
    const deducer = new (await import(deducerName)).default();
    return await deducer.deduce({
      filepaths: files,
    });
  } catch (err) {
    if (process.env.DEBUG) {
      logger.error(err);
    }
    logger.error(
      `Failed to deduce. Have you provided a correct package name '${deducerName}' and installed it?`
    );
    process.exit(1);
  }
}

export async function loadAndGenerate(
  generatorName: string,
  archRef: arch.Architecture,
  outdir: string
): Promise<string> {
  // try to construct the generator, exit with error if failed to import
  try {
    const generator = new (await import(generatorName)).default();
    return await generator.generate({
      archRef: archRef,
      outdir: outdir,
    });
  } catch (err) {
    logger.error(
      `Failed to generate. Have you provided a correct package name '${generatorName}' and installed it?`
    );
    process.exit(1);
  }
}

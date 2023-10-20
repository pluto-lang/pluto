import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import { arch } from "@pluto/base";
import logger from "../log";
import { loadConfig } from "../utils";

const GRAPHVIZ_GENERATOR_PKG = "@pluto/graphviz-generator";

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

  // get current stack, and set the output directory
  const proj = loadConfig();
  const sta = proj.getStack(proj.current);
  if (!sta) {
    logger.error("There is not existing stack. Please create a new one first.");
    process.exit(1);
  }
  const outdir = path.join(".pluto", sta.name);

  // construct the arch ref from user code
  const archRef = await loadAndDeduce(opts.deducer, files);
  const yamlText = yaml.dump(archRef, { noRefs: true });
  fs.writeFileSync(path.join(outdir, "arch.yml"), yamlText);

  // generate the graphviz file
  await loadAndGenerate(GRAPHVIZ_GENERATOR_PKG, archRef, outdir);

  // generate the IR code based on the arch ref
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
    if (process.env.DEBUG) {
      logger.error(err);
    }
    logger.error(
      `Failed to generate. Have you provided a correct package name '${generatorName}' and installed it?`
    );
    process.exit(1);
  }
}

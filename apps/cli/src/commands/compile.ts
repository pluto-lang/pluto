import fs from "fs";
import path, { resolve } from "path";
import * as yaml from "js-yaml";
import { arch, core } from "@plutolang/base";
import logger from "../log";
import { buildDeducer, buildGenerator } from "./utils";
import { PLUTO_PROJECT_OUTPUT_DIR, isPlutoProject, loadProject } from "../utils";

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
  const projectRoot = resolve("./");
  if (!isPlutoProject(projectRoot)) {
    logger.error("The current location is not located at the root of a Pluto project.");
    logger.debug(`Current directory: ${projectRoot}`);
    process.exit(1);
  }
  const project = loadProject(projectRoot);

  const stackName = opts.stack ?? project.current;
  if (!stackName) {
    logger.error(
      "There isn't a default stack. Please use the --stack option to specify which stack you want."
    );
    process.exit(1);
  }

  const stack = project.getStack(stackName);
  if (!stack) {
    logger.error(`There is no stack named ${stackName}.`);
    process.exit(1);
  }

  const basicArgs: core.BasicArgs = {
    project: project.name,
    stack: stack,
    rootpath: path.resolve("."),
  };
  const stackBaseDir = path.join(projectRoot, PLUTO_PROJECT_OUTPUT_DIR, stackName);
  const generatedDir = path.join(stackBaseDir, "generated");

  // construct the arch ref from user code
  const { archRef } = await loadAndDeduce(opts.deducer, basicArgs, [entrypoint]);
  const yamlText = yaml.dump(archRef, { noRefs: true });
  fs.writeFileSync(path.join(stackBaseDir, "arch.yml"), yamlText);

  // generate the graphviz file
  await loadAndGenerate(GRAPHVIZ_GENERATOR_PKG, basicArgs, archRef, stackBaseDir);

  // generate the IR code based on the arch ref
  await loadAndGenerate(opts.generator, basicArgs, archRef, generatedDir);
}

export async function loadAndDeduce(
  deducerName: string,
  basicArgs: core.BasicArgs,
  files: string[]
): Promise<core.DeduceResult> {
  // try to construct the deducer, exit with error if failed to import
  try {
    const deducer = await buildDeducer(deducerName, basicArgs);
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
    const generator = await buildGenerator(generatorName, basicArgs);
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

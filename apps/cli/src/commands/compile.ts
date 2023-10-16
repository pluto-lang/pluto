import fs from "fs";
import logger from "../log";
import { Deducer, Generator } from "@pluto/base";

export interface CompileOptions {
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

  let deducer: Deducer;
  let generator: Generator;

  // try to construct the deducer, exit with error if failed to import
  try {
    deducer = new (await import(opts.deducer)).default();
  } catch (err) {
    logger.error(
      `Failed to Construct the deducer. Have you provided a correct package name '${opts.deducer}' and installed it?`
    );
    process.exit(1);
  }

  // try to construct the generator, exit with error if failed to import
  try {
    generator = new (await import(opts.generator)).default();
  } catch (err) {
    logger.error(
      `Failed to construct the generator. Have you provided a correct package name '${opts.generator}' and installed it?`
    );
    process.exit(1);
  }

  const archRef = await deducer.deduce({
    filepaths: files,
  });
  console.log(archRef);

  await generator.generate({
    archRef: archRef,
    outdir: ".pluto",
  });
}

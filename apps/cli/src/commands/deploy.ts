import path from "path";
import fs from "fs";
import { table, TableUserConfig } from "table";
import { confirm } from "@inquirer/prompts";
import { arch, core, project } from "@plutolang/base";
import { BuildAdapterByEngine } from "@plutolang/adapters";
import logger from "../log";
import { loadConfig, saveConfig } from "../utils";
import { loadAndDeduce, loadAndGenerate } from "./compile";
import { loadArchRef } from "./utils";

export interface DeployOptions {
  stack?: string;
  deducer: string;
  generator: string;
  apply: boolean;
  yes: boolean;
}

export async function deploy(entrypoint: string, opts: DeployOptions) {
  // Ensure the entrypoint exist.
  if (!fs.existsSync(entrypoint)) {
    throw new Error(`No such file, ${entrypoint}`);
  }

  const proj = loadConfig();
  let sta: project.Stack | undefined;
  if (opts.stack) {
    sta = proj.getStack(opts.stack);
    if (!sta) {
      logger.error("No such stack.");
      process.exit(1);
    }
  } else {
    sta = proj.getStack(proj.current);
    if (!sta) {
      logger.error("There is not existing stack. Please create a new one first.");
      process.exit(1);
    }
  }

  const basicArgs: core.BasicArgs = {
    project: proj.name,
    stack: sta,
    rootpath: path.resolve("."),
  };

  let archRef: arch.Architecture | undefined;
  let infraEntrypoint: string | undefined;
  // No deduction or generation, only application.
  if (!opts.apply) {
    // construct the arch ref from user code
    logger.info("Generating reference architecture...");
    const deduceResult = await loadAndDeduce(opts.deducer, basicArgs, [entrypoint]);
    archRef = deduceResult.archRef;

    const confirmed = await confirmArch(archRef, opts.yes);
    if (!confirmed) {
      logger.info("You can modify your code and try again.");
      process.exit(1);
    }

    // generate the IR code based on the arch ref
    logger.info("Generating the IaC Code and computing modules...");
    const outdir = path.join(".pluto", sta.name);
    const generateResult = await loadAndGenerate(opts.generator, basicArgs, archRef, outdir);
    infraEntrypoint = path.resolve(outdir, generateResult.entrypoint!);
  }
  archRef = archRef ?? loadArchRef(`.pluto/${sta.name}/arch.yml`);
  infraEntrypoint =
    infraEntrypoint ?? path.resolve("./", `.pluto/${sta.name}/compiled/${sta.engine}.js`);

  const workdir = path.resolve("./", `.pluto/${sta.name}/compiled`);
  // build the adapter based on the engine type
  const adpt = BuildAdapterByEngine(sta.engine, {
    ...basicArgs,
    entrypoint: infraEntrypoint,
    workdir: workdir,
    archRef: archRef,
  });
  if (!adpt) {
    logger.error("No such engine.");
    process.exit(1);
  }
  if (sta.adapter) {
    adpt.load(sta.adapter?.state);
  }

  try {
    sta.adapter = {
      entrypoint: infraEntrypoint,
      workdir: workdir,
      state: adpt.dump(),
    };
    saveConfig(proj);

    logger.info("Applying...");
    const applyResult = await adpt.deploy();

    logger.info("Successfully applied!");
    logger.info("Here are the resource outputs:");
    for (const key in applyResult.outputs) {
      logger.info(`${key}:`, applyResult.outputs[key]);
    }

    sta.adapter = {
      entrypoint: infraEntrypoint,
      workdir: workdir,
      state: adpt.dump(),
    };
    saveConfig(proj);
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
    } else {
      logger.error(e);
    }
    process.exit(1);
  }
}

async function confirmArch(archRef: arch.Architecture, confirmed: boolean): Promise<boolean> {
  // Create the resource table for printing.
  const resData = [["Name", "Type", "Location"]];
  for (const resName in archRef.resources) {
    const resource = archRef.resources[resName];
    if (resource.type == "Root") continue;

    let position = "";
    if (resource.locations.length > 0) {
      const loc = resource.locations[0];
      position = path.basename(loc.file) + `:${loc.linenum.start},${loc.linenum.end}`;
    }
    resData.push([resName, resource.type, position]);
  }

  // To display the resource table, which includes the resources in the arch ref
  const resConfig: TableUserConfig = {
    drawHorizontalLine: (lineIndex: number, rowCount: number) => {
      return lineIndex === 0 || lineIndex === 2 || lineIndex === 1 || lineIndex === rowCount;
    },
    header: {
      content: "Resource in Architecture Reference",
    },
  };
  console.log(table(resData, resConfig));

  // Create the relationship table for printing.
  const relatData = [["From", "To", "Type", "Operation"]];
  for (const relat of archRef.relationships) {
    if (relat.from.type == "Root") continue;

    const typ = relat.type == "access" ? "Access" : "Create";
    relatData.push([relat.from.name, relat.to.name, typ, relat.operation]);
  }

  // To display the relationship table, which includes the relationships among resources in the arch ref.
  const relatConfig: TableUserConfig = {
    drawHorizontalLine: (lineIndex: number, rowCount: number) => {
      return lineIndex === 0 || lineIndex === 2 || lineIndex === 1 || lineIndex === rowCount;
    },
    header: {
      content: "Relationship between Resources",
    },
  };
  console.log(table(relatData, relatConfig));

  const result =
    confirmed ||
    (await confirm({
      message: "Does this reference architecture satisfy the design of your application?",
      default: true,
    }));
  return result;
}

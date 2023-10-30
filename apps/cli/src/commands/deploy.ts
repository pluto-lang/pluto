import path from "path";
import { table, TableUserConfig } from "table";
import { confirm } from "@inquirer/prompts";
import { arch, project } from "@plutolang/base";
import { BuildAdapterByEngine } from "@plutolang/adapters";
import logger from "../log";
import { loadConfig } from "../utils";
import { loadAndDeduce, loadAndGenerate } from "./compile";

export interface DeployOptions {
  stack?: string;
  deducer: string;
  generator: string;
  apply: boolean;
  yes: boolean;
}

export async function deploy(files: string[], opts: DeployOptions) {
  // If the user only privides one file, change the variable to an array.
  if (typeof files === "string") {
    files = [files];
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

  let entrypointFile: string | undefined;
  // No deduction or generation, only application.
  if (!opts.apply) {
    // construct the arch ref from user code
    logger.info("Generating reference architecture...");
    const archRef = await loadAndDeduce(opts.deducer, files);

    const confirmed = await confirmArch(archRef, opts.yes);
    if (!confirmed) {
      logger.info("You can modify your code and try again.");
      process.exit(1);
    }

    // generate the IR code based on the arch ref
    logger.info("Generating the IaC Code and computing modules...");
    const outdir = path.join(".pluto", sta.name);
    entrypointFile = await loadAndGenerate(opts.generator, archRef, outdir);
    if (process.env.DEBUG) {
      logger.debug("Entrypoint file: ", entrypointFile);
    }
  }

  // build the adapter based on the engine type
  const adpt = BuildAdapterByEngine(sta.engine);
  if (!adpt) {
    logger.error("No such engine.");
    process.exit(1);
  }

  logger.info("Applying...");
  const applyResult = await adpt.apply({
    projName: proj.name,
    stack: sta,
    // TODO: Store the last entrypoint for use in 'apply only' mode.
    entrypoint: entrypointFile ?? `.pluto/${sta.name}/compiled/${sta.engine}.js`,
  });
  if (applyResult.error) {
    logger.error(applyResult.error);
    process.exit(1);
  }

  logger.info("Successfully applied!");
  for (const key in applyResult.outputs) {
    logger.info(`${key}: ${applyResult.outputs[key]}`);
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

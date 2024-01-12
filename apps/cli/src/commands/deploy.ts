import path, { resolve } from "path";
import fs from "fs";
import * as yaml from "js-yaml";
import { table, TableUserConfig } from "table";
import { confirm } from "@inquirer/prompts";
import { arch, core } from "@plutolang/base";
import logger from "../log";
import { loadAndDeduce, loadAndGenerate } from "./compile";
import { buildAdapter, loadArchRef, selectAdapterByEngine } from "./utils";
import { loadProject, dumpProject, PLUTO_PROJECT_OUTPUT_DIR, isPlutoProject } from "../utils";
import { ensureDirSync } from "fs-extra";

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

  const projectRoot = resolve("./");
  if (!isPlutoProject(projectRoot)) {
    logger.error("The current location is not located at the root of a Pluto project.");
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
    rootpath: projectRoot,
    stack: stack,
  };
  const stackBaseDir = path.join(projectRoot, PLUTO_PROJECT_OUTPUT_DIR, stackName);
  const generatedDir = path.join(stackBaseDir, "generated");
  ensureDirSync(generatedDir);

  let archRef: arch.Architecture | undefined;
  let infraEntrypoint: string | undefined;
  // No deduction or generation, only application.
  if (!opts.apply) {
    // construct the arch ref from user code
    logger.info("Generating reference architecture...");
    const deduceResult = await loadAndDeduce(opts.deducer, basicArgs, [entrypoint]);
    archRef = deduceResult.archRef;

    const yamlText = yaml.dump(archRef, { noRefs: true });
    const archRefFile = path.join(stackBaseDir, "arch.yml");
    fs.writeFileSync(archRefFile, yamlText);
    stack.archRefFile = archRefFile;

    const confirmed = await confirmArch(archRef, opts.yes);
    if (!confirmed) {
      logger.info("You can modify your code and try again.");
      process.exit(1);
    }

    // generate the IR code based on the arch ref
    logger.info("Generating the IaC Code and computing modules...");
    const generateResult = await loadAndGenerate(opts.generator, basicArgs, archRef, generatedDir);
    infraEntrypoint = path.resolve(generatedDir, generateResult.entrypoint!);
    stack.provisionFile = infraEntrypoint;

    dumpProject(project);
  } else {
    if (!stack.archRefFile || !stack.provisionFile) {
      logger.error("Please avoid using the --apply option during the initial deployment.");
      process.exit(1);
    }
    archRef = loadArchRef(stack.archRefFile);
    infraEntrypoint = stack.provisionFile;
  }

  // TODO: make the workdir same with generated dir.
  const workdir = path.join(generatedDir, `compiled`);
  // build the adapter based on the provisioning engine type
  const adapterPkg = selectAdapterByEngine(stack.provisionType);
  if (!adapterPkg) {
    logger.error(`There is no adapter for type ${stack.provisionType}.`);
    process.exit(1);
  }
  const adapter = await buildAdapter(adapterPkg, {
    ...basicArgs,
    archRef: archRef,
    entrypoint: infraEntrypoint!,
    workdir: workdir,
  });
  if (stack.adapterState) {
    adapter.load(stack.adapterState);
  }

  let exitCode = 0;
  try {
    logger.info("Applying...");
    const applyResult = await adapter.deploy();
    stack.setDeployed();
    logger.info("Successfully applied!");

    logger.info("Here are the resource outputs:");
    for (const key in applyResult.outputs) {
      logger.info(`${key}:`, applyResult.outputs[key]);
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
    } else {
      logger.error(e);
    }
    exitCode = 1;
  } finally {
    stack.adapterState = adapter.dump();
    dumpProject(project);
  }
  process.exit(exitCode);
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

    relatData.push([relat.from.name, relat.to.name, relat.type, relat.operation]);
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

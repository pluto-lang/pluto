import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import { core, LanguageType, ProvisionType } from "@plutolang/base";
import { Architecture } from "@plutolang/base/arch";
import { ExitError } from "../errors";
import { isPlutoProject, loadProject } from "../utils";

/**
 * load the default export of the target package.
 */
async function loadPackage(pkgName: string): Promise<any> {
  try {
    require.resolve(pkgName);
  } catch (e) {
    if (process.env.DEBUG) {
      console.error(e);
    }
    throw new Error(
      `'${pkgName}' doesn't exists. Have you provided a correct package name and installed it?`
    );
  }
  return (await import(pkgName)).default;
}

export async function buildDeducer(
  deducerPkg: string,
  deducerArgs: core.NewDeducerArgs
): Promise<core.Deducer> {
  const deducer = new (await loadPackage(deducerPkg))(deducerArgs);
  if (isDeducer(deducer)) {
    return deducer;
  }
  throw new Error(`The default export of '${deducerPkg}' package is not a valid Deducer.`);
}

function isDeducer(obj: any): obj is core.Deducer {
  // Because the deducer package could be bundled by webpack, when trying to confirm if an object is
  // an instance of core.Deducer, we might get a false. Hence, we simply verify the presence of the
  // `deduce` method instead.
  return typeof obj.deduce === "function";
}

export async function buildGenerator(
  generatorPkg: string,
  generatorArgs: core.NewGeneratorArgs
): Promise<core.Generator> {
  const generator = new (await loadPackage(generatorPkg))(generatorArgs);
  if (generator instanceof core.Generator) {
    return generator;
  }
  throw new Error(`The default export of '${generatorPkg}' package is not a valid Generator.`);
}

export async function buildAdapterByProvisionType(
  provisionType: ProvisionType,
  adapterArgs: core.NewAdapterArgs
): Promise<core.Adapter> {
  // build the adapter based on the provisioning engine type
  const adapterPkg = selectAdapterByEngine(provisionType);
  if (!adapterPkg) {
    throw new Error(`There is no adapter for type ${provisionType}.`);
  }

  const adapter = new (await loadPackage(adapterPkg))(adapterArgs);
  if (adapter instanceof core.Adapter) {
    return adapter;
  }
  throw new Error(`The default export of '${adapterPkg}' package is not a valid Adapter.`);
}

export function selectAdapterByEngine(provisionType: ProvisionType): string | undefined {
  const mapping: { [k in ProvisionType]?: string } = {
    [ProvisionType.Pulumi]: "@plutolang/pulumi-adapter",
    [ProvisionType.Simulator]: "@plutolang/simulator-adapter",
  };
  return mapping[provisionType];
}

export function loadArchRef(filepath: string): Architecture {
  const content = fs.readFileSync(filepath);
  return yaml.load(content.toString()) as Architecture;
}

export function stackStateFile(stateDir: string): string {
  return path.join(stateDir, "state.json");
}

export function loadProjectRoot() {
  // Get the absolute path of the project root.
  const projectRoot = path.resolve("./");
  if (!isPlutoProject(projectRoot)) {
    throw new Error("The current location is not located at the root of a Pluto project.");
  }
  return projectRoot;
}

export function loadProjectAndStack(projectRoot: string, stackInCmd?: string) {
  // Load the project configuration.
  const project = loadProject(projectRoot);

  // Get the stack name from the options or the default stack set in the project configuration.
  const stackName = stackInCmd ?? project.current;
  if (!stackName) {
    throw new Error(
      "There isn't a default stack. Please use the --stack option to specify which stack you want."
    );
  }

  const stack = project.getStack(stackName);
  if (!stack) {
    throw new Error(`There is no stack named ${stackName}.`);
  }
  return { project, stack };
}

const deducerPkgMap: Record<LanguageType, string> = {
  [LanguageType.Python]: "@plutolang/pyright-deducer",
  [LanguageType.TypeScript]: "@plutolang/static-deducer",
};

export function getDefaultDeducerPkg(lang: LanguageType, deducerInCmd?: string): string {
  return deducerInCmd ?? deducerPkgMap[lang];
}

export function getDefaultEntrypoint(lang: LanguageType): string {
  switch (lang) {
    case LanguageType.Python:
      return "app/main.py";
    case LanguageType.TypeScript:
      return "src/index.ts";
    default:
      throw new Error(`Invalid language type: ${lang}`);
  }
}

export function formatError(e: any) {
  if (e instanceof ExitError) {
    exitGracefully();
    return;
  }

  if (e instanceof Error) {
    console.error(e.message);
  } else {
    console.error(e);
  }

  if (process.env.DEBUG) {
    console.error(e);
  }
}

export function exitGracefully(sig?: string) {
  if (process.env.DEBUG) {
    console.warn(`\nReceived ${sig}. Exiting...`);
  }
  console.log("Bye~ 👋");
  process.exit(1);
}

import fs from "fs";
import * as yaml from "js-yaml";
import { arch, core, engine } from "@plutolang/base";

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
  basicArgs: core.BasicArgs
): Promise<core.Deducer> {
  return new (await loadPackage(deducerPkg))(basicArgs) as core.Deducer;
}

export async function buildGenerator(
  generatorPkg: string,
  basicArgs: core.BasicArgs
): Promise<core.Generator> {
  return new (await loadPackage(generatorPkg))(basicArgs) as core.Generator;
}

export async function buildAdapter(
  adapterPkg: string,
  adapterArgs: core.NewAdapterArgs
): Promise<core.Adapter> {
  return new (await loadPackage(adapterPkg))(adapterArgs) as core.Adapter;
}

export function selectAdapterByEngine(engineType: engine.Type): string | undefined {
  const mapping: { [k in engine.Type]?: string } = {
    [engine.Type.pulumi]: "@plutolang/pulumi-adapter",
    [engine.Type.simulator]: "@plutolang/simulator-adapter",
  };
  return mapping[engineType];
}

export function loadArchRef(filepath: string): arch.Architecture {
  const content = fs.readFileSync(filepath);
  return yaml.load(content.toString()) as arch.Architecture;
}

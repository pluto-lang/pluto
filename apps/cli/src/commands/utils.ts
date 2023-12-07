import fs from "fs";
import * as yaml from "js-yaml";
import { arch } from "@plutolang/base";

/**
 * load the default export of the target package.
 */
export async function loadPackage(pkgName: string): Promise<any> {
  try {
    require.resolve(pkgName);
  } catch (e) {
    throw new Error(
      `'${pkgName}' doesn't exists. Have you provided a correct package name and installed it?`
    );
  }
  return (await import(pkgName)).default;
}

export function loadArchRef(filepath: string): arch.Architecture {
  const content = fs.readFileSync(filepath);
  return yaml.load(content.toString()) as arch.Architecture;
}

import * as fs from "fs-extra";
import * as path from "path";
import { ComputeClosure } from "@plutolang/base/closure";
import { AnyFunction } from "@plutolang/pluto";
import { LanguageType } from "@plutolang/base";

/**
 * The child importer is used to import a child closure in its parent closure.
 * @param placeholder - The placeholder in the parent closure for the child closure. The parent
 * closure will call the child closure using this placeholder.
 * @param childDirName - The directory name of the child closure.
 * @param childExportName - The export name of the child closure. We will import the export name
 * from the `childDirName` directory.
 */
type ChildImporter = (placeholder: string, childDirName: string, childExportName: string) => string;

/**
 * Serialize a closure to a directory recursively. The closure can be written in Python or
 * TypeScript.
 *
 * @param outdir - The output directory.
 * @param closure - The closure to serialize.
 * @param language - The language of the closure (Python or TypeScript).
 * @param exec - Whether to add an invoke statement to the entrypoint file.
 * @returns The path to the entrypoint of the serialized closure.
 *
 * This function serializes a closure to a directory. It supports closures written in Python and
 * TypeScript. The serialized closure can be executed after serialization if the `exec` parameter is
 * set to `true`.
 */
export function dumpClosureToDir(
  outdir: string,
  closure: ComputeClosure<AnyFunction>,
  language: LanguageType,
  exec: boolean = false
): string {
  // Define how to import a child closure in Python.
  const pythonChildImporter: ChildImporter = (placeholder, childDirName, childExportName) => {
    return `
def ${placeholder}(*args, **kwargs):
  from ${childDirName} import ${childExportName}
  return ${childExportName}(*args, **kwargs)
`;
  };

  // Define how to import a child closure in TypeScript.
  const typescriptChildImporter: ChildImporter = (placeholder, childDirName, childExportName) => {
    return `
var ${placeholder} = async (...args) => {
  const handler = require("./${childDirName}").${childExportName};
  return await handler(...args);
};
`;
  };

  // Determine the entrypoint name and child importer based on the language. The `entrypointName`
  // should match the entrypoint name of the package in the respective language.
  let entrypointName: string;
  let childImporter: ChildImporter;
  switch (language) {
    case LanguageType.Python:
      entrypointName = "__init__.py";
      childImporter = pythonChildImporter;
      break;
    case LanguageType.TypeScript:
      entrypointName = "index.js";
      childImporter = typescriptChildImporter;
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }

  // Recursively serialize the closure and its child closures.
  function dumpRecursivly(
    outdir: string,
    closure: ComputeClosure<AnyFunction>,
    depth: number = 0
  ): string {
    const child = closure.innerClosure;
    const childDirName = `child_${depth}`;
    const childWorkdir = child ? path.join(outdir, childDirName) : undefined;
    if (child) {
      if (!closure.placeholder) {
        throw new Error(
          `This closure '${closure.dirpath}' has a child closure but no placeholder.`
        );
      }
      dumpRecursivly(childWorkdir!, child, depth + 1);
    }

    if (!fs.existsSync(closure.dirpath)) {
      throw new Error(`The closure path '${closure.dirpath}' does not exist.`);
    }

    fs.ensureDirSync(outdir);
    const entrypoint = path.join(outdir, entrypointName);
    const stat = fs.statSync(closure.dirpath);
    if (stat.isDirectory()) {
      fs.copySync(closure.dirpath, outdir);
      if (!fs.existsSync(entrypoint)) {
        // If this closure is a directory, we assume that the entrypoint file
        // already exists by default. If it doesn't, an error will be thrown.
        throw new Error(
          `The entrypoint file '${entrypoint}' for this directory closure '${closure.dirpath}' does not exist.`
        );
      }
    } else {
      fs.copySync(closure.dirpath, entrypoint);
    }

    if (closure.placeholder) {
      if (!child) {
        throw new Error(
          `This closure '${closure.dirpath}' has a placeholder but no child closure.`
        );
      }
      const closureImportStat = childImporter(closure.placeholder, childDirName, child.exportName);
      const content = fs.readFileSync(entrypoint, "utf-8");
      fs.writeFileSync(entrypoint, closureImportStat + content);
    }

    return entrypoint;
  }

  const entrypoint = dumpRecursivly(outdir, closure);
  if (exec) {
    // Add the invoke statement to the entrypoint file, if the `exec` is `true`.
    const content = fs.readFileSync(entrypoint, "utf-8");
    const invokeStat = `\n${closure.exportName}()`;
    fs.writeFileSync(entrypoint, content + invokeStat);
  }

  return entrypoint;
}

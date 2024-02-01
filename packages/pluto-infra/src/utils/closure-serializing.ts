import * as fs from "fs-extra";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import { ComputeClosure, Dependency, isComputeClosure } from "@plutolang/base/closure";
import { AnyFunction } from "@plutolang/pluto";

interface NestedDependencies {
  closure?: ComputeClosure<AnyFunction>;
  dependencies?: Dependency[];
  innerClosureParts?: NestedDependencies;
}

/** @internal */
export function extractAndClearDependency(
  closure: ComputeClosure<AnyFunction>
): NestedDependencies {
  const parts: NestedDependencies = {
    closure: closure,
    dependencies: closure.dependencies,
  };
  closure.dependencies = undefined;

  if (closure.innerClosure) {
    parts.innerClosureParts = extractAndClearDependency(closure.innerClosure);
  }
  return parts;
}

/** @internal */
export function backfillDependency(
  closure: ComputeClosure<AnyFunction>,
  parts: NestedDependencies
) {
  closure.dependencies = parts.dependencies;
  if (closure.innerClosure && parts.innerClosureParts) {
    backfillDependency(closure.innerClosure, parts.innerClosureParts);
  }
}

/** @internal */
export async function canBeSerialized(handler: Function) {
  try {
    await pulumi.runtime.serializeFunction(handler);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * The options for serializing a closure to a directory.
 */
interface SerializeClosureToDirOptions {
  // A boolean value that indicates if the entrypoint file serves as a module, or an executable file.
  exec?: boolean;
  // The name of the exported function in the entrypoint file.
  exportName?: string;
}

/**
 * Serializes a closure (function) with its dependencies to a directory.
 *
 * @param workdir - The working directory where the serialized function will be saved.
 * @param closure - The closure to be serialized.
 * @param options - The options for serializing the closure.
 * @returns The path to the entrypoint file.
 * @internal
 */
export async function serializeClosureToDir(
  workdir: string,
  closure: ComputeClosure<AnyFunction>,
  options?: SerializeClosureToDirOptions
): Promise<string> {
  if (!fs.existsSync(workdir)) {
    throw new Error(`The working directory ${workdir} does not exist.`);
  }

  const exec = options?.exec ?? false;
  const exportName = options?.exportName ?? "handler";

  // Serialize the function, but do not serialize its dependencies and any user-defined inner
  // closures. This is because these user-defined closures may contain objects that are not
  // serializable. The verification should be performed during the deduction phase, and if a
  // closure cannot be serialized, an error should be thrown at this stage.
  const dependencies = extractAndClearDependency(closure);
  const serializedFunction = await pulumi.runtime.serializeFunction(closure, {
    serialize: (obj: any) => {
      if (isComputeClosure(obj)) {
        if (obj.dirpath !== "inline") {
          return false;
        }
      }
      return true;
    },
    exportName: exportName,
    isFactoryFunction: false,
    allowSecrets: true,
  });
  backfillDependency(closure, dependencies);

  // Save the serialized function to a file.
  const entrypointFileName = `__index.js`;
  const entrypointFilePath = path.join(workdir, entrypointFileName);
  fs.writeFileSync(entrypointFilePath, serializedFunction.text);

  // The serialized function is a importable module. So, if we want to directly execute the
  // entrypoint file, we need to invoke the exported function in the file.
  if (exec) {
    addInvokeStat(entrypointFilePath, exportName);
  }

  // Move the user-defined inner closures to the working directory. Then, modify the file that
  // contains the serialized function to import the inner closures.
  //
  // TODO: Note: The consensus is that the variable which used to call the user-defined closure in the
  // serialized function should be defined as `__handler_`. This stipulation, however, limits us
  // to supporting just one inner closure. Therefore, it's incumbent upon SDK developers to ensure
  // that the variable is defined as `__handler_`.
  moveUserClosuresToWorkingDir(closure, workdir);
  modifyEntrypointFile(entrypointFilePath, closure);

  return entrypointFilePath;
}

/**
 * Insert the invoke statement to the entrypoint file.
 */
function addInvokeStat(entrypointFilePath: string, handlerName: string) {
  // Insert the invoke statement.
  const invokeStat = `\nexports.${handlerName}();`;
  fs.appendFileSync(entrypointFilePath, invokeStat);
}

/**
 * This function moves user-defined closures (functions) to a specified working directory.
 *
 * @param closure - An object of type ComputeClosure representing a user-defined function.
 * @param workdir - A string representing the path to the working directory.
 */
function moveUserClosuresToWorkingDir(closure: ComputeClosure<AnyFunction>, workdir: string) {
  let currentClosure: ComputeClosure<AnyFunction> | undefined = closure;
  while (currentClosure != undefined) {
    if (currentClosure.dirpath !== "inline") {
      fs.copySync(
        currentClosure.dirpath,
        path.join(workdir, path.basename(currentClosure.dirpath))
      );
    }
    currentClosure = currentClosure.innerClosure;
  }
}

/**
 * This function modifies an entrypoint file by inserting an import statement for a user-defined closure.
 *
 * @param entrypointFilePath - The path to the entrypoint file.
 * @param closure - The closure to be computed, which can be any function.
 */
function modifyEntrypointFile(entrypointFilePath: string, closure: ComputeClosure<AnyFunction>) {
  // iterates over the closures until it finds a user-defined closure (one that is not inline).
  let closureDirpath: string | undefined;
  let currentClosure: ComputeClosure<AnyFunction> | undefined = closure;
  while (true) {
    if (currentClosure === undefined) {
      break;
    }

    if (currentClosure.dirpath !== "inline") {
      if (closureDirpath === undefined) {
        closureDirpath = currentClosure.dirpath;
      } else {
        // If it finds more than one user-defined closure, it throws an error.
        throw new Error("Currently, one infrastructure api only support one user-defined closure.");
      }
    }
    currentClosure = currentClosure.innerClosure;
  }
  // If it doesn't find any user-defined closure, this represents that this closure is purely
  // constructed by sdk developer.
  if (closureDirpath === undefined) {
    return;
  }

  // If a user-defined closure is found, inserts an import statement at the top of the entrypoint
  // file. This import statement imports the user-defined closure from its directory. Then, it
  // replaces the placeholder "__handler_: undefined" in the entrypoint file with "__handler_:
  // __handler_".
  //
  // We postpone the require statement by placing it within an asynchronous function. This approach
  // is necessary because the module being imported might need information from the environment,
  // which is initialized in the platform adaptation function, such as the AWS_ACCOUNT_ID.
  const userClosureImportStat = `
var __handler_ = async (...args) => {
  const handler = require("./${path.basename(closureDirpath)}").default;
  return await handler(...args);
};\n`;
  const entrypointFileContent = fs
    .readFileSync(entrypointFilePath, "utf-8")
    .replace(/__handler_: undefined/g, "__handler_: __handler_");
  fs.writeFileSync(entrypointFilePath, userClosureImportStat + entrypointFileContent);
}

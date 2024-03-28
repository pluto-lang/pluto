import * as fs from "fs";
import * as path from "path";
import { Uri } from "pyright-internal/dist/common/uri/uri";
import { Program } from "pyright-internal/dist/analyzer/program";
import { ConfigOptions } from "pyright-internal/dist/common/configOptions";
import { FullAccessHost } from "pyright-internal/dist/common/fullAccessHost";
import { ImportResolver } from "pyright-internal/dist/analyzer/importResolver";
import { LogLevel, StandardConsole } from "pyright-internal/dist/common/console";
import { createFromRealFileSystem } from "pyright-internal/dist/common/realFileSystem";
import { createServiceProvider } from "pyright-internal/dist/common/serviceProviderExtensions";

export interface CreateProgramOptions {
  logLevel?: LogLevel;
  pythonPath?: string;
  extraPaths?: string[];
}

export function createProgram(options: CreateProgramOptions = {}) {
  (global as any).__rootDirectory = resolvePyrightRoot();

  const logLevel = options.logLevel ?? LogLevel.Error;
  const output = new StandardConsole(logLevel);
  const fs = createFromRealFileSystem();
  const serviceProvider = createServiceProvider(fs, output);

  const configOptions = new ConfigOptions(Uri.empty());
  configOptions.typeCheckingMode = "strict";
  configOptions.pythonPath = options.pythonPath ? Uri.file(options.pythonPath) : undefined;
  configOptions.defaultExtraPaths = options.extraPaths?.map((p) => Uri.file(p));
  // This is a workaround for a situation where pyright doesn't recognize the types if a library
  // doesn't have a `py.typed` file.
  configOptions.useLibraryCodeForTypes = true;

  const importResolver = new ImportResolver(
    serviceProvider,
    configOptions,
    new FullAccessHost(serviceProvider)
  );

  const program = new Program(importResolver, configOptions, serviceProvider);
  return program;
}

function resolvePyrightRoot(): string {
  const resolveResult = require.resolve("pyright-internal/dist/analyzer/program");
  if (typeof resolveResult === "number") {
    // The result is a number that represents the current process running a production webpack
    // bundle. The typeshed-fallback directory is copied to the root of the bundle. So we use the
    // root of the bundle as the the root of pyright-internal.
    return __dirname;
  }

  // There are two situations where the result is a string:
  // 1. In a Jest test environment, the filepath below is an absolute path to the `program.js` file.
  // 2. In a development webpack environment, the filepath is a relative path to the `program.js`
  //    file from the root of this package.
  const filepath = path.resolve(__dirname, "..", resolveResult);
  let currentDir = path.dirname(filepath);
  while (!fs.existsSync(path.join(currentDir, "typeshed-fallback"))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error("Cannot find the root directory of typeshed-fallback.");
    }
    currentDir = parentDir;
  }
  return currentDir;
}

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

  const importResolver = new ImportResolver(
    serviceProvider,
    configOptions,
    new FullAccessHost(serviceProvider)
  );

  const program = new Program(importResolver, configOptions, serviceProvider);
  return program;
}

function resolvePyrightRoot(): string {
  const modulePath = require.resolve("pyright-internal/dist/analyzer/program");
  let currentDir = path.dirname(modulePath);
  while (!fs.existsSync(path.join(currentDir, "package.json"))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error("Cannot find pyright root directory.");
    }
    currentDir = parentDir;
  }
  return currentDir;
}

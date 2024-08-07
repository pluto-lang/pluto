import { glob } from "glob";
import * as path from "path";
import * as fs from "fs-extra";
import { ParseOptions, Parser } from "pyright-internal/dist/parser/parser";
import { DiagnosticSink } from "pyright-internal/dist/common/diagnosticSink";
import {
  ImportResolver,
  createImportedModuleDescriptor,
} from "pyright-internal/dist/analyzer/importResolver";
import { Uri } from "pyright-internal/dist/common/uri/uri";
import { ModuleNameNode } from "pyright-internal/dist/parser/parseNodes";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import { ExecutionEnvironment } from "pyright-internal/dist/common/configOptions";
import { ImportResult, ImportType } from "pyright-internal/dist/analyzer/importResult";
import { PlatformType } from "@plutolang/base";
import { InstalledModule, LocalModule, Module, ModuleSet } from "./module-bundler";
import { getDefaultPythonRuntime } from "./module-bundler/command-utils";

import allAwsLambdaModulesPython38 from "./all_aws_lambda_modules_python3.8.txt";
import allAwsLambdaModulesPython39 from "./all_aws_lambda_modules_python3.9.txt";
import allAwsLambdaModulesPython310 from "./all_aws_lambda_modules_python3.10.txt";
import allAwsLambdaModulesPython311 from "./all_aws_lambda_modules_python3.11.txt";
import allAwsLambdaModulesPython312 from "./all_aws_lambda_modules_python3.12.txt";

function extractRawAwsModules(raw: string) {
  // List of modules that are already included in AWS Lambda environment and should be ignored when
  // packaging the code for AWS Lambda.
  return raw
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .map((line) => line.replace(/\.__init__$/g, ""));
}

function debugPrint(...args: any[]) {
  if (process.env.DEBUG) {
    console.log(...args);
  }
}

export class ImportFinder {
  private static readonly awsLambdaContainedModules: Map<string, string[]> = new Map([
    ["python3.8", extractRawAwsModules(allAwsLambdaModulesPython38)],
    ["python3.9", extractRawAwsModules(allAwsLambdaModulesPython39)],
    ["python3.10", extractRawAwsModules(allAwsLambdaModulesPython310)],
    ["python3.11", extractRawAwsModules(allAwsLambdaModulesPython311)],
    ["python3.12", extractRawAwsModules(allAwsLambdaModulesPython312)],
  ]);

  private readonly runtime?: string;

  // Cache for the imported modules of each file or directory.
  private readonly cache: Map<string, Module[]> = new Map();

  constructor(
    private readonly importResolver: ImportResolver,
    private readonly execEnv: ExecutionEnvironment,
    private readonly codebase: string,
    private readonly platform?: PlatformType,
    runtime?: string
  ) {
    this.runtime = runtime;
  }

  public async getImportedModulesForSingleFile(sourceFilepath: string): Promise<Module[]> {
    const modules = await this.getImportedModules(sourceFilepath, new Set());
    return modules;
  }

  private async getImportedModules(
    fileOrDirPath: string,
    visitedPaths: Set<string>
  ): Promise<Module[]> {
    if (this.cache.has(fileOrDirPath)) {
      return this.cache.get(fileOrDirPath)!;
    }

    const importedModules = new ModuleSet();

    const importResults = this.getImports(fileOrDirPath);
    for (const importResult of importResults) {
      const moduleName = importResult.importName;
      if (await this.shouldIgnore(importResult)) {
        debugPrint("Ignoring import:", moduleName);
        continue;
      }

      const pkgDir = getModulePath(importResult);
      if (pkgDir && this.isLocalModule(pkgDir)) {
        if (pkgDir.startsWith(fileOrDirPath)) {
          debugPrint("Ignoring subdirectory:", moduleName, pkgDir);
          // This import is importing a module in the same directory or its subdirectory. This root
          // module is already included in the importedModules. So, we don't need to include it
          // again.
          continue;
        }

        if (visitedPaths.has(pkgDir)) {
          // This module is already visited. Avoid infinite loop.
          continue;
        }
        visitedPaths.add(pkgDir);

        // Local module
        debugPrint("Found a local module:", moduleName, pkgDir);

        importedModules.add(LocalModule.create(moduleName, pkgDir));
        const subImportedModules = await this.getImportedModules(pkgDir, visitedPaths);
        subImportedModules.forEach((m) => importedModules.add(m));
      } else {
        // Installable module
        const installedPkg = getInstallableModule(importResult);
        importedModules.add(installedPkg);
        debugPrint(
          `Found installable module ${installedPkg.name}==${installedPkg.version} for ${moduleName}`
        );
      }
    }

    this.cache.set(fileOrDirPath, importedModules.toArray());
    return importedModules.toArray();
  }

  private isLocalModule(modulePath: string) {
    return modulePath.startsWith(this.codebase);
  }

  private async shouldIgnore(importInfo: ImportResult, modulePath?: string) {
    const moduleName = importInfo.importName;

    if (
      this.platform &&
      this.platform === PlatformType.AWS &&
      (await this.shouldIgnoreForAWS(importInfo))
    ) {
      // Ignore the modules that are already included in AWS Lambda environment.
      return true;
    }

    return (
      moduleName === "" || // private module
      modulePath?.endsWith(".so") || // native module
      !importInfo.isImportFound || // not found
      importInfo.importType === ImportType.BuiltIn || // built-in
      importInfo.isStdlibTypeshedFile // typeshed file
    );
  }

  private async shouldIgnoreForAWS(importInfo: ImportResult) {
    const moduleName = importInfo.importName;
    const containedModules = ImportFinder.awsLambdaContainedModules.get(
      this.runtime ?? (await getDefaultPythonRuntime())
    );
    return (
      containedModules &&
      (containedModules.includes(moduleName) || containedModules.includes(moduleName + ".__init__"))
    );
  }

  private getImports(fileOrDirPath: string): ImportResult[] {
    const imports = fs.statSync(fileOrDirPath).isDirectory()
      ? this.getImportsOfDirectory(fileOrDirPath)
      : this.getImportsOfFile(fileOrDirPath);
    return imports;
  }

  private getImportsOfDirectory(dirpath: string): ImportResult[] {
    const files = glob.sync(path.join(dirpath, "**/*.py"));
    const imports: Map<string, ImportResult> = new Map();
    for (const file of files) {
      const importResults = this.getImportsOfFile(file);
      for (const importResult of importResults) {
        imports.set(importResult.importName, importResult);
      }
    }
    return Array.from(imports.values());
  }

  /**
   * Retrieves the top-level modules for each module imported in the given file.
   * @param filepath - The path of the file to retrieve imports from.
   * @returns An array of ImportResult objects representing the imports.
   */
  private getImportsOfFile(filepath: string): ImportResult[] {
    const importResults: ImportResult[] = [];

    const included = new Set<string>();
    const moduleNames = this.getAllModuleNames(filepath);
    // Iterate through each module name in the file, and resolve the top-level module for each name.
    moduleNames.forEach((moduleName) => {
      const rootModuleName = moduleName.split(".")[0];
      if (included.has(rootModuleName)) {
        // Skip the module if it's already included.
        return;
      }
      included.add(rootModuleName);

      const moduleDesc = createImportedModuleDescriptor(rootModuleName);
      const importResult = this.importResolver.resolveImport(
        Uri.file(filepath),
        this.execEnv,
        moduleDesc
      );
      importResults.push(importResult);
    });

    return importResults;
  }

  /**
   * Iterates through the parse tree of the given file and retrieves all the module names that are
   * imported using absolute imports.
   */
  private getAllModuleNames(filepath: string) {
    const parser = new Parser();
    const parseOptions = new ParseOptions();
    const diagSink = new DiagnosticSink();

    const content = fs.readFileSync(filepath, "utf-8");
    const parseResult = parser.parseSourceFile(content, parseOptions, diagSink);
    if (!parseResult.parseTree) {
      throw new Error("Failed to parse file");
    }

    const visitor = new ImportVisitor();
    visitor.walk(parseResult.parseTree);
    return visitor.moduleNames;
  }
}

class ImportVisitor extends ParseTreeWalker {
  public readonly moduleNames: string[] = [];

  visitModuleName(node: ModuleNameNode): boolean {
    const moduleName = node.nameParts.map((part) => part.value).join(".");
    this.moduleNames.push(moduleName);
    return false;
  }
}

function getModulePath(module: ImportResult) {
  const dirpath = module.packageDirectory?.key;
  const filepath = module.resolvedUris.length > 0 ? module.resolvedUris[0].key : undefined;
  return dirpath || filepath;
}

/**
 * This function is used to get the installable module from a given import result.
 *
 * @param {ImportResult} module - The import result, which contains the import name and module path.
 * @returns {Module} - The installable module.
 */
function getInstallableModule(module: ImportResult): InstalledModule {
  const pkgName = module.importName;
  const pkgPath = getModulePath(module);

  if (pkgPath) {
    const distInfos = getAllDistInfos(path.dirname(pkgPath));
    for (const distInfo of distInfos) {
      if (distInfo.topLevel.includes(pkgName)) {
        return InstalledModule.create(distInfo.name, distInfo.version);
      }
    }
  }

  return InstalledModule.create(pkgName);
}

interface DistInfo {
  readonly name: string;
  readonly version: string;
  readonly topLevel: readonly string[];
}

/**
 * This function is used to get all distribution information from a given package path.
 *
 * Each distribution information object contains:
 * - name: The name of the distribution.
 * - version: The version of the distribution.
 * - topLevel: An array of top-level module names in the distribution.
 *
 * @param {string} pkgPath - The directory path that stores the dist-info directories.
 * @returns {DistInfo[]} - An array of distribution information objects.
 */
function getAllDistInfos(pkgPath: string): DistInfo[] {
  // Get all ".dist-info" directories in the package path.
  const distInfoDirNames = fs.readdirSync(pkgPath).filter((p) => p.endsWith(".dist-info"));
  // For each ".dist-info" directory, get the distribution information.
  return distInfoDirNames.map((distInfoDirName) => {
    let distName: string | undefined;
    let distVersion: string | undefined;

    // Read the "METADATA" file to get the distribution's name and version.
    const metadataPath = path.join(pkgPath, distInfoDirName, "METADATA");
    const metadata = fs.readFileSync(metadataPath);
    const lines = metadata.toString().split("\n");
    for (const line of lines) {
      const [key, value] = line.split(":");
      switch (key.trim()) {
        case "Name":
          distName = value.trim();
          break;
        case "Version":
          distVersion = value.trim();
          break;
      }
    }

    if (!distName || !distVersion) {
      // If the name or version is not found in the "METADATA" file, throw an error.
      throw new Error(`Cannot find name or version in ${metadataPath}`);
    }

    // Read the "top_level.txt" file to get the top-level module names.
    let topLevel: string[] = [];
    const topLevelPath = path.join(pkgPath, distInfoDirName, "top_level.txt");
    if (fs.existsSync(topLevelPath)) {
      const content = fs.readFileSync(topLevelPath);
      topLevel = content
        .toString()
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    } else {
      // If the "top_level.txt" file does not exist, use the distribution name as the top-level
      // module name.
      topLevel.push(distName);
    }
    // Replace all hyphens in the top-level module names with underscores. Because the hyphens in
    // the module names are replaced with underscores in the import statements.
    topLevel = topLevel.map((name) => (name = name.replace(/-/g, "_")));

    return {
      name: distName,
      version: distVersion,
      topLevel,
    };
  });
}

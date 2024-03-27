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
import { Module } from "./module-bundler";

const awsLambdaContainedModulesTxt = {
  "3.10": path.join(__dirname, "all_aws_lambda_modules_python3.10.txt"),
};

export class ImportFinder {
  // List of modules that are already included in AWS Lambda environment and should be ignored when
  // packaging the code for AWS Lambda.
  private static readonly awsLambdaContainedModules: string[] = fs
    .readFileSync(awsLambdaContainedModulesTxt["3.10"], "utf-8")
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .map((line) => line.replace(/\.__init__$/g, ""));

  constructor(
    private readonly importResolver: ImportResolver,
    private readonly execEnv: ExecutionEnvironment,
    private readonly platform?: PlatformType
  ) {}

  public getImportedModulesForSingleFile(sourceFilepath: string): Module[] {
    const imports = this.getImportsOfFile(sourceFilepath);

    const importedModules: { name: string; version?: string }[] = [];
    for (const imp of imports) {
      const moduleName = imp.importName;
      if (this.shouldIgnore(imp)) {
        continue;
      }
      const version = getModuleVersion(imp);
      importedModules.push({ name: moduleName, version });
    }

    return importedModules;
  }

  private shouldIgnore(importInfo: ImportResult, modulePath?: string) {
    const moduleName = importInfo.importName;

    if (
      this.platform &&
      this.platform === PlatformType.AWS &&
      this.shouldIgnoreForAWS(importInfo)
    ) {
      // Ignore the modules that are already included in AWS Lambda environment.
      return true;
    }

    return (
      moduleName === "" || // private module
      moduleName.startsWith(".") || // relative import
      modulePath?.endsWith(".so") || // native module
      !importInfo.isImportFound || // not found
      importInfo.importType === ImportType.BuiltIn || // built-in
      importInfo.isStdlibTypeshedFile || // typeshed file
      importInfo.isThirdPartyTypeshedFile // typeshed file
    );
  }

  private shouldIgnoreForAWS(importInfo: ImportResult) {
    const moduleName = importInfo.importName;
    return (
      ImportFinder.awsLambdaContainedModules.includes(moduleName) ||
      ImportFinder.awsLambdaContainedModules.includes(moduleName + ".__init__")
    );
  }

  /**
   * Retrieves the top-level modules for each module imported in the given file.
   * @param filepath - The path of the file to retrieve imports from.
   * @returns An array of ImportResult objects representing the imports.
   */
  private getImportsOfFile(filepath: string): readonly ImportResult[] {
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
    if (node.leadingDots === 0) {
      // Only consider the absolute import.
      const moduleName = node.nameParts.map((part) => part.value).join(".");
      this.moduleNames.push(moduleName);
    }
    return false;
  }
}

function getModulePath(module: ImportResult) {
  const dirpath = module.packageDirectory?.key;
  const filepath = module.resolvedUris.length > 0 ? module.resolvedUris[0].key : undefined;
  return dirpath || filepath;
}

/**
 * Try to get the version of the module by looking at the dist-info directory.
 * @param module - The module to get the version of.
 * @returns The version of the module if found, otherwise undefined.
 */
function getModuleVersion(module: ImportResult) {
  const pkgName = module.importName;
  const pkgPath = getModulePath(module);
  if (!pkgPath) {
    return;
  }

  // Find the dist-info directory that matches the package name.
  const reg = new RegExp(`^${pkgName}-(\\d+(\\.\\d+)*?)\\.dist-info$`);
  const distInforDirnames = fs.readdirSync(path.dirname(pkgPath)).filter((dirname) => {
    return reg.test(dirname);
  });

  if (distInforDirnames.length !== 1) {
    // No dist-info directory found or multiple dist-info directories found, we can't determine the
    // version.
    return;
  }

  // Extract the version from the dist-info directory name.
  const match = reg.exec(distInforDirnames[0]);
  return match ? match[1] : undefined;
}

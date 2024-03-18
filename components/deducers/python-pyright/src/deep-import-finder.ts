import assert from "assert";
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

const awsLambdaContainedModulesTxt = {
  "3.10": path.join(__dirname, "all_aws_lambda_modules_python3.10.txt"),
};

type DependencyGraph = Map<string, string[]>;

export class DeepImportFinder {
  // List of modules that are already included in AWS Lambda environment and should be ignored when
  // packaging the code for AWS Lambda.
  private static readonly awsLambdaContainedModules: string[] = fs
    .readFileSync(awsLambdaContainedModulesTxt["3.10"], "utf-8")
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .map((line) => line.replace(/\.__init__$/g, ""));

  private readonly moduleNameToInfo: Map<string, ImportResult> = new Map();
  private readonly dependencyGraph: DependencyGraph = new Map();

  constructor(
    private readonly importResolver: ImportResolver,
    private readonly execEnv: ExecutionEnvironment,
    private readonly platform?: PlatformType
  ) {}

  /**
   * Get all the dependent modules of the provided source file, as well as the nested dependent
   * modules of imported modules.
   * @param sourceFilepath - The source file to get the dependent modules for.
   * @returns The absolute paths of the dependent modules.
   */
  public getDependentModules(sourceFilepath: string): readonly string[] {
    const imports = this.getImportsOfFile(sourceFilepath);

    // Build the dependency graph. This graph is cached, so it will not be rebuilt for the same
    // module.
    for (const imp of imports) {
      this.buildGraph(imp);
    }

    // Iterate through the dependency graph to get all the dependent modules.
    const reachedModules = new Set<string>();
    for (const imp of imports) {
      this.getReachedModules(imp.importName, reachedModules);
    }

    // Get the absolute paths of the dependent modules.
    const modulePaths: string[] = [];
    for (const moduleName of reachedModules) {
      const importInfo = this.moduleNameToInfo.get(moduleName)!;
      const modulePath = getModulePath(importInfo);
      if (this.shouldIgnore(importInfo, modulePath)) {
        // Ignore the modules that are not needed.
        continue;
      }

      if (modulePath) {
        modulePaths.push(modulePath);
      } else {
        throw new Error(`Failed to get module path for ${moduleName}.`);
      }
    }

    return modulePaths;
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
      DeepImportFinder.awsLambdaContainedModules.includes(moduleName) ||
      DeepImportFinder.awsLambdaContainedModules.includes(moduleName + ".__init__")
    );
  }

  private getReachedModules(moduleName: string, reachedModules: Set<string>) {
    if (reachedModules.has(moduleName)) {
      // Reaching here represents a circular dependency. We don't need to go further.
      return;
    }
    reachedModules.add(moduleName);

    const deps = this.dependencyGraph.get(moduleName);
    assert(deps !== undefined, `Failed to get dependencies for ${moduleName}.`);
    for (const dep of deps) {
      this.getReachedModules(dep, reachedModules);
    }
  }

  /**
   * To enhance the dependency graph starting from the given module. The graph is built recursively.
   * @param currentModule
   * @returns
   */
  private buildGraph(currentModule: ImportResult) {
    const curModuleName = currentModule.importName;
    if (this.dependencyGraph.has(curModuleName)) {
      // If the module is already in the graph, the dependencies are already built or in the process
      // of being built. We don't need to build it again.
      return;
    }

    this.dependencyGraph.set(curModuleName, []);
    this.moduleNameToInfo.set(curModuleName, currentModule);

    // Get the absolute path of the module.
    const modulePath = getModulePath(currentModule);
    if (!modulePath) {
      // If the module path isn't found, we have no way to build the graph for it.
      return;
    }

    // Retrieve all Python files within this module, then extract the imports from each file, and
    // recursively construct the graph.
    const stat = fs.statSync(modulePath);
    const pyfiles = stat.isDirectory() ? this.getAllPyFilesInModuleDir(modulePath) : [modulePath];
    for (const pyfile of pyfiles) {
      const importedModules = this.getImportsOfFile(pyfile);
      for (const importedModule of importedModules) {
        const moduleName = importedModule.importName;

        if (isSubModule(importedModule, currentModule)) {
          // Although the module is imported using an absolute import, it's actually a sub-module of
          // the current module. It should be ignored.
          continue;
        }

        // Add a edge from the current module to the imported module.
        this.dependencyGraph.get(curModuleName)!.push(moduleName);
        this.buildGraph(importedModule);
      }
    }
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

  /**
   * Get all the Python files in the given module directory.
   */
  private getAllPyFilesInModuleDir(moduleDir: string): string[] {
    const sourceFiles: string[] = [];
    const files = fs.readdirSync(moduleDir);
    for (const file of files) {
      const filepath = path.join(moduleDir, file);
      if (fs.statSync(filepath).isDirectory()) {
        sourceFiles.push(...this.getAllPyFilesInModuleDir(filepath));
      }

      if (file.endsWith(".py")) {
        sourceFiles.push(filepath);
      }
    }
    return sourceFiles;
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

/**
 * Check if the child module is a submodule of the parent module. If the absolute path of the child
 * module starts with or is equal to the absolute path of the parent module, then the child module
 * is a submodule of the parent module.
 */
function isSubModule(child: ImportResult, parent: ImportResult) {
  const parentPath = getModulePath(parent);
  const childPath = getModulePath(child);
  return parentPath && childPath && new RegExp(`^${parentPath}(/|$)`).test(childPath);
}

function getModulePath(module: ImportResult) {
  const dirpath = module.packageDirectory?.key;
  const filepath = module.resolvedUris.length > 0 ? module.resolvedUris[0].key : undefined;
  return dirpath || filepath;
}

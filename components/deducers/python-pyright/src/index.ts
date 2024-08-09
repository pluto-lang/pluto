import assert from "assert";
import { glob } from "glob";
import * as path from "path";
import * as fs from "fs-extra";
import { Uri } from "pyright-internal/dist/common/uri/uri";
import { LogLevel } from "pyright-internal/dist/common/console";
import { Program } from "pyright-internal/dist/analyzer/program";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { getChildNodes } from "pyright-internal/dist/analyzer/parseTreeWalker";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import {
  ArgumentNode,
  CallNode,
  FunctionNode,
  ParseNodeType,
} from "pyright-internal/dist/parser/parseNodes";
import { core, arch, PlatformType } from "@plutolang/base";
import packageJson from "../package.json";
import { TypeSearcher } from "./type-searcher";
import { ImportFinder } from "./import-finder";
import * as ProgramUtils from "./program-utils";
import { CodeExtractor } from "./code-extractor";
import { bundleModules } from "./module-bundler";
import {
  CustomInfraFn,
  validateCustomInfraFn,
  evaluateGraph,
  buildGraphForFunction,
  buildGraphForModule,
  ProjectInfo,
} from "./custom-infra-fn";
import * as TypeConsts from "./type-consts";
import * as ScopeUtils from "./scope-utils";
import { SpecialNodeMap } from "./special-node-map";
import { Diagnostic, DiagnosticCategory } from "./diagnostic";
import { ResourceObjectTracker } from "./resource-object-tracker";
import { ValueEvaluator, createValueEvaluator } from "./value-evaluator";
import { getDefaultPythonRuntime } from "./module-bundler/command-utils";

export default class PyrightDeducer extends core.Deducer {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = packageJson.name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = packageJson.version;

  private readonly closureDir: string;

  private typeEvaluator?: TypeEvaluator;
  private sepcialNodeMap?: SpecialNodeMap<CallNode>;
  private tracker?: ResourceObjectTracker;
  private valueEvaluator?: ValueEvaluator;
  private extractor?: CodeExtractor;
  private importFinder?: ImportFinder;

  private readonly bundleFilename: string;
  private readonly handlerName: string;

  constructor(args: core.NewDeducerArgs) {
    super(args);
    this.closureDir = args.closureDir;

    if (this.stack.configs["entrypoint"]) {
      const parts = this.stack.configs["entrypoint"].split(".");
      assert(parts.length === 2, "The entrypoint must be in the format of 'filename.handler'.");
      this.bundleFilename = parts[0] + ".py";
      this.handlerName = parts[1];
    } else {
      this.bundleFilename = "__init__.py";
      this.handlerName = "_default";
    }
  }

  public async deduce(entrypoints: string[]): Promise<core.DeduceResult> {
    entrypoints.forEach((entrypoint, idx) => {
      if (!path.isAbsolute(entrypoint)) {
        entrypoints[idx] = path.resolve(this.rootpath, entrypoint);
      }
    });
    this.valideArgumentsWithThrow(entrypoints);

    const { program, sourceFile } = this.pyrightAnalyze(entrypoints);
    this.typeEvaluator = program.evaluator;
    if (!this.typeEvaluator) {
      throw new Error("No type evaluator found.");
    }

    // Find the special nodes in the source file, which include those found within the body of a
    // function.
    this.sepcialNodeMap = this.getSecpialNodes(program, sourceFile);

    const infraFns = findCandidateInfraFns(this.sepcialNodeMap, sourceFile);
    const diagnostics: Diagnostic[] = infraFns
      .map((fn) => validateCustomInfraFn(fn, this.typeEvaluator!, this.sepcialNodeMap!))
      .flat();
    diagnostics.forEach((d) => Diagnostic.print(d));

    if (diagnostics.find((d) => d.category === DiagnosticCategory.Error)) {
      // If there are errors, we should stop the deducing process.
      throw new Error("Errors found in the custom infrastructure functions. See the above logs.");
    }

    this.valueEvaluator = createValueEvaluator(this.typeEvaluator);
    this.tracker = new ResourceObjectTracker(this.typeEvaluator);
    this.extractor = new CodeExtractor(this.typeEvaluator, this.sepcialNodeMap);

    const projectInfo: ProjectInfo = {
      projectName: this.project,
      stackName: this.stack.name,
      bundleBaseDir: this.closureDir,
    };

    const globalGraph = buildGraphForModule(
      this.typeEvaluator!,
      this.tracker,
      sourceFile.getParseResults()!.parseTree
    );
    const { archRef: globalArchRef, resourceMapping: globalResourceMapping } = evaluateGraph(
      globalGraph,
      projectInfo,
      sourceFile,
      this.typeEvaluator!,
      this.valueEvaluator!,
      this.extractor!,
      this.tracker!,
      {
        bundleFilename: this.bundleFilename,
        exportName: this.handlerName,
      }
    );

    const partialArchRefs: arch.Architecture[] = [];
    const customInfraFnCallNodes = this.findAllCustomInfraFnCallNodes(infraFns, sourceFile);
    for (let i = 0; i < customInfraFnCallNodes.length; i++) {
      const customInfraFnCall = customInfraFnCallNodes[i];
      const graph = buildGraphForFunction(
        this.typeEvaluator!,
        this.tracker,
        customInfraFnCall.functionNode
      );

      const argumentFillings: Map<number, ArgumentNode> = new Map();
      customInfraFnCall.callNode.arguments.forEach((argNode, idx) => {
        const parameterNodeId = customInfraFnCall.functionNode.parameters[idx].id;
        argumentFillings.set(parameterNodeId, argNode);
      });

      const partialArchRef = evaluateGraph(
        graph,
        projectInfo,
        sourceFile,
        this.typeEvaluator!,
        this.valueEvaluator!,
        this.extractor!,
        this.tracker!,
        {
          resourceFillings: globalResourceMapping,
          argumentFillings: argumentFillings,
          bundleFilename: this.bundleFilename,
          exportName: this.handlerName,
          bundleIdSuffix: `custom_infra_fn_${i}`,
        }
      );
      partialArchRefs.push(partialArchRef.archRef);
    }

    const archRef = new arch.Architecture();
    for (const ref of [globalArchRef, ...partialArchRefs]) {
      // Avoid the duplication of resources. If a custom infrastructure function depends on the
      // global resources, we don't need to add them again
      ref.resources
        .filter((r) => !archRef.findResource(r.id))
        .forEach((value) => archRef.addResource(value));

      ref.closures.forEach((value) => archRef.addClosure(value));
      ref.relationships.forEach((value) => archRef.addRelationship(value));
      Object.keys(ref.extras).forEach((key) => (archRef.extras[key] = ref.extras[key]));
    }

    const execEnv = program.importResolver
      .getConfigOptions()
      .findExecEnvironment(Uri.file(entrypoints[0]))!;
    this.importFinder = new ImportFinder(
      program.importResolver,
      execEnv,
      this.stack.configs["codebase"] /* used as a splitting tool */ ?? this.rootpath + "/app",
      this.stack.platformType
    );
    await this.prepareDependencies(archRef.closures);

    program.dispose();

    return { archRef };
  }

  private findAllCustomInfraFnCallNodes(customInfraFns: CustomInfraFn[], sourceFile: SourceFile) {
    const customInfraFnCallNodes: { callNode: CallNode; functionNode: FunctionNode }[] = [];

    const childNodes = getChildNodes(sourceFile.getParseResults()!.parseTree);
    for (const childNode of childNodes) {
      if (childNode?.nodeType !== ParseNodeType.StatementList) {
        continue;
      }

      for (const statement of childNode.statements) {
        if (
          statement.nodeType !== ParseNodeType.Call ||
          statement.leftExpression.nodeType !== ParseNodeType.Name
        ) {
          continue;
        }

        const fnName = statement.leftExpression;

        // First, check if the function name is same as one custom infrastructure function name.
        const infraFn = customInfraFns.find((fn) => fn.topNode.name.value === fnName.value);
        if (!infraFn) {
          continue;
        }

        // Find the declaration of the called function.
        const decls = this.typeEvaluator!.getDeclarationsForNameNode(fnName);
        assert(
          decls?.length === 1,
          `The function name \`${fnName.value}\` must be declared only once.`
        );

        // Second, check if the call node is calling the found custom infrastructure function.
        if (infraFn.topNode.id === decls[0].node.id) {
          customInfraFnCallNodes.push({
            callNode: statement,
            functionNode: decls[0].node as FunctionNode,
          });
        }
      }
    }

    return customInfraFnCallNodes;
  }

  /**
   * Find the special nodes in the source file, which include those found within the body of a
   * function. These special node are:
   * 1. the resource object construction nodes.
   * 2. the infrastructure API call nodes.
   * 3. the client API call nodes.
   * 4. the nodes that access the captured properties.
   */
  private getSecpialNodes(program: Program, sourceFile: SourceFile) {
    const parseResult = sourceFile.getParseResults();
    if (!parseResult) {
      throw new Error(`No parse result found in source file '${sourceFile.getUri().key}'.`);
    }
    const parseTree = parseResult.parseTree;

    const walker = new TypeSearcher(program.evaluator!);
    walker.walk(parseTree);
    return walker.specialNodeMap;
  }

  private valideArgumentsWithThrow(entrypoints: string[]) {
    if (entrypoints.length === 0) {
      throw new Error("No entrypoints provided.");
    }
    if (entrypoints.length > 1) {
      throw new Error("Only one entrypoint is supported, currently.");
    }
    // Check if all the entrypoint files exist.
    for (const filepath of entrypoints) {
      if (!fs.existsSync(filepath)) {
        throw new Error(`File not found: ${filepath}`);
      }
    }
  }

  /**
   * Utilize the Pyright API to complete the basic analysis.
   */
  private pyrightAnalyze(entrypoints: string[]) {
    const program = ProgramUtils.createProgram({
      logLevel: LogLevel.Warn,
      extraPaths: [this.rootpath, path.join(this.rootpath, "app")],
    });

    const fileUris = entrypoints.map((name) => Uri.file(name));
    program.setTrackedFiles(fileUris);
    // Wait for the analysis to complete
    // eslint-disable-next-line no-empty
    while (program.analyze()) {}

    const sourceFile = program.getSourceFile(fileUris[0]);
    if (!sourceFile) {
      throw new Error(`No source file found for '${fileUris[0].key}'.`);
    }

    return { program, sourceFile };
  }

  private async prepareDependencies(closures: readonly arch.Closure[]) {
    console.log(`Bundling dependencies, this may take a while...`);

    const installPkg = this.stack.configs["bundleWithDependencies"] !== false;
    const runtime = await getDefaultPythonRuntime();

    await Promise.all(
      closures.map((closure) =>
        bundleOne(closure, this.stack.platformType, this.importFinder!, this.bundleFilename)
      )
    );

    async function bundleOne(
      closure: arch.Closure,
      platformType: PlatformType,
      importFinder: ImportFinder,
      bundleFilename: string
    ) {
      const destBaseDir = path.resolve(closure.path, "site-packages");
      const closureFile = path.resolve(closure.path, bundleFilename);
      const modules = await importFinder!.getImportedModulesForSingleFile(closureFile);

      // The process of bundling may eliminate some files that were previously there. Therefore, we
      // tidy up the  folder, leaving only the entrypoint file and the directory that stores the
      // installed dependencies.
      for (const file of await glob("*", { cwd: closure.path })) {
        const fullpath = path.resolve(closure.path, file);
        if (fullpath !== destBaseDir && fullpath !== closureFile) {
          await fs.remove(fullpath);
        }
      }

      // TODO: Make the Python version and architecture configurable. These values will be used in
      // multiple places, including the Deducer and the infrastructure SDK. The former determines
      // the Python version and architecture for bundling dependencies, while the latter sets the
      // cloud runtime environment.
      await bundleModules(runtime, "x86_64", modules, closure.path, destBaseDir, {
        install: installPkg,
        slim: true,
        // By default, we'll delete the `dist-info` directory, but LangChain needs it, so we'll just
        // delete the `.pyc` and `__pycache__` files.
        uselessFilesPatterns: ["**/*.pyc", "**/__pycache__"],
        cache: true,
        platform: platformType,
      });
    }
  }
}

/**
 * Get all the user-defined functions which contain infrastructure API calls.
 */
function findCandidateInfraFns(
  sepcialNodeMap: SpecialNodeMap<CallNode>,
  sourceFile: SourceFile
): CustomInfraFn[] {
  const constructNodes = sepcialNodeMap.getNodesByType(TypeConsts.IRESOURCE_FULL_NAME);
  if (!constructNodes) {
    throw new Error("No resource object construction found.");
  }
  // It's okay to have no infrastructure API calls. Some users might just want to create cloud
  // resources.
  const infraApiNodes =
    sepcialNodeMap.getNodesByType(TypeConsts.IRESOURCE_INFRA_API_FULL_NAME) ?? [];
  // The resource object construction and infrastructure API calls are collectively referred to as
  // infrastructure calls.
  const infraCallNodes = [constructNodes, infraApiNodes].flat();

  // Find all the custom infrastructure functions. If a infrastructure call is in a function, we
  // consider it as a custom infrastructure function.
  const customInfraFns: Map<number, CustomInfraFn> = new Map();
  for (const node of infraCallNodes) {
    if (ScopeUtils.inGlobalScope(node, sourceFile)) {
      continue;
    }
    const scopeHierarchy = ScopeUtils.getScopeHierarchy(node);
    assert(scopeHierarchy && scopeHierarchy.length > 0, `No scope hierarchy found for node.`);
    const topNode = ScopeUtils.findTopNodeInScope(node, scopeHierarchy[0]);
    assert(topNode, `No top node found in scope.`);
    if (!customInfraFns.has(topNode.id)) {
      assert(
        topNode.nodeType === ParseNodeType.Function,
        `The custom infra fn must be a function.`
      );
      customInfraFns.set(topNode.id, { topNode, sourceFile, hierarchy: scopeHierarchy });
    }
  }
  return Array.from(customInfraFns.values());
}

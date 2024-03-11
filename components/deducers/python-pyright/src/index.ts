import * as path from "path";
import * as fs from "fs-extra";
import { Uri } from "pyright-internal/dist/common/uri/uri";
import { LogLevel } from "pyright-internal/dist/common/console";
import { Program } from "pyright-internal/dist/analyzer/program";
import { TypeCategory } from "pyright-internal/dist/analyzer/types";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { ArgumentCategory, CallNode } from "pyright-internal/dist/parser/parseNodes";
import { DeduceResult, Deducer } from "@plutolang/base/core";
import * as TextUtils from "./text-utils";
import * as TypeConsts from "./type-consts";
import * as ProgramUtils from "./program-utils";
import * as ScopeUtils from "./scope-utils";
import { TypeSearcher } from "./type-searcher";
import { SpecialNodeMap } from "./special-node-map";
import { Value, ValueEvaluator } from "./value-evaluator";
import { ResourceObjectTracker } from "./resource-object-tracker";

export default class PyrightDeducer extends Deducer {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(path.join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(path.join(__dirname, "../package.json")).version;

  private sepcialNodeMap?: SpecialNodeMap<CallNode>;

  public deduce(entrypoints: string[]): Promise<DeduceResult> {
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

    const program = ProgramUtils.createProgram({
      logLevel: LogLevel.Warn,
      extraPaths: [
        path.resolve(__dirname, "../../../../packages/base-py"),
        path.resolve(__dirname, "../../../../packages/pluto-py"),
      ],
    });
    const fileUris = entrypoints.map((name) => Uri.file(name));
    program.setTrackedFiles(fileUris);
    // Wait for the analysis to complete
    // eslint-disable-next-line no-empty
    while (program.analyze()) {}

    const sourceFile = program.getSourceFile(fileUris[0])!;

    this.sepcialNodeMap = this.getSecpialNodes(program, sourceFile);
    const constructNodes = this.sepcialNodeMap.getNodesByType(TypeConsts.IRESOURCE_FULL_NAME);
    const infraApiNodes = this.sepcialNodeMap.getNodesByType(
      TypeConsts.IRESOURCE_INFRA_API_FULL_NAME
    );
    for (const node of [constructNodes, infraApiNodes].flat()) {
      if (node && !ScopeUtils.inGlobalScope(node, sourceFile)) {
        throw new Error(
          "All constructor and infrastructre API calls related to pluto resource types should be in global scope. We will relax this restriction in the future."
        );
      }
    }

    const tracker = new ResourceObjectTracker(program.evaluator!, this.sepcialNodeMap);

    const specialTypes = this.sepcialNodeMap.getSpicalTypes();
    console.log(specialTypes.length, "types of special nodes found.");
    for (const specialType of specialTypes) {
      const nodes = this.sepcialNodeMap.getNodesByType(specialType)!;

      console.log("Special Node:", specialType);
      nodes.forEach((node) => {
        console.log("/--------------------\\");
        console.log("|", TextUtils.getTextOfNode(node, sourceFile));

        if (specialType === TypeConsts.IRESOURCE_FULL_NAME) {
          console.log("| NodeID:", node.id);
        }

        if (
          specialType === TypeConsts.IRESOURCE_INFRA_API_FULL_NAME ||
          specialType === TypeConsts.IRESOURCE_CLIENT_API_FULL_NAME
        ) {
          const constuctNode = tracker.getConstructNodeForApiCall(node, sourceFile);
          if (!constuctNode) {
            const nodeText = TextUtils.getTextOfNode(node, sourceFile);
            throw new Error(`No related node found for node '${nodeText}'.`);
          }
          console.log("| Related Node ID: ", constuctNode.id);
        }

        if (
          specialType === TypeConsts.IRESOURCE_FULL_NAME ||
          specialType === TypeConsts.IRESOURCE_INFRA_API_FULL_NAME
        ) {
          getArgumentValue(node, sourceFile, program.evaluator!);
          // console.log(inGlobalScope(node, sourceFile));
        }
        console.log("\\--------------------/\n\n");
      });
    }

    program.dispose();
    return {} as any;
  }

  /**
   * Use the TypeSearcher to get the special nodes in the source file.
   */
  private getSecpialNodes(program: Program, sourceFile: SourceFile) {
    const parseResult = sourceFile.getParseResults();
    if (!parseResult) {
      throw new Error(`No parse result found in source file '${sourceFile.getUri().key}'.`);
    }
    const parseTree = parseResult.parseTree;

    const walker = new TypeSearcher(program.evaluator!, sourceFile);
    walker.walk(parseTree);
    return walker.specialNodeMap;
  }
}

function getArgumentValue(
  callNode: CallNode,
  sourceFile: SourceFile,
  typeEvaluator: TypeEvaluator
) {
  callNode.arguments.forEach((arg) => {
    console.log("| Argument:");
    console.log("|   Text: ", TextUtils.getTextOfNode(arg, sourceFile));

    const valueNodeType = typeEvaluator.getType(arg.valueExpression);
    if (valueNodeType?.category === TypeCategory.Function) {
      console.log("|   Value is a function, we need to encapsulate it into closures afterward.");
      return;
    }

    if (arg.argumentCategory === ArgumentCategory.Simple) {
      const valueEvaluator = new ValueEvaluator(typeEvaluator);
      const value = valueEvaluator.getValue(arg.valueExpression);
      console.log("|   Value: ", value);
      console.log("|   Stringified: ", Value.toString(value));
    }
  });
}

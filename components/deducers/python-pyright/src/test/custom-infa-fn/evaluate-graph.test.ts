import assert from "assert";
import { getChildNodes } from "pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ArgumentNode,
  FunctionNode,
  ModuleNode,
  ParseNodeType,
} from "pyright-internal/dist/parser/parseNodes";
import * as TestUtils from "../test-utils";
import { buildGraphForFunction, buildGraphForModule } from "../../custom-infra-fn/build-graph";
import { evaluateGraph } from "../../custom-infra-fn/evaluate-graph";
import { createValueEvaluator } from "../../value-evaluator";
import { TypeSearcher } from "../../type-searcher";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { CodeExtractor } from "../../code-extractor";
import { ResourceObjectTracker } from "../../resource-object-tracker";

test("should", () => {
  const code = `
from pluto_client import Router, Queue

router_global = Router("router")

def custom_infra_fn(router_param: Router, path: str):
  router_param.get("/path")
  queue = Queue("queue")

  router_internal = Router(path, lambda x: x)

custom_infra_fn(router_global, "path")
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  const { tmpdir, cleanup } = TestUtils.getTmpDir();

  try {
    const tracker = new ResourceObjectTracker(program.evaluator!);
    const specialNodeMap = getSecpialNodes(
      program.evaluator!,
      sourceFile.getParseResults()!.parseTree
    );

    const parseTree = sourceFile.getParseResults()?.parseTree;
    assert(parseTree, "No parse tree found in source file.");
    const globalGraph = buildGraphForModule(program.evaluator!, tracker, parseTree);
    const { resourceMapping: resourceFillings } = evaluateGraph(
      globalGraph,
      new Map(),
      new Map(),
      {
        projectName: "project",
        stackName: "stack",
        bundleBaseDir: tmpdir,
      },
      sourceFile,
      program.evaluator!,
      createValueEvaluator(program.evaluator!),
      new CodeExtractor(program.evaluator!, specialNodeMap),
      tracker
    );

    const childNodes = getChildNodes(sourceFile.getParseResults()!.parseTree);
    const functionNodes = childNodes.filter((n) => n?.nodeType === ParseNodeType.Function);
    expect(functionNodes).toHaveLength(1);

    const functionNode = functionNodes[0] as FunctionNode;
    const graph = buildGraphForFunction(program.evaluator!, tracker, functionNode);

    const callNodes = childNodes.flatMap((n) =>
      n?.nodeType === ParseNodeType.StatementList &&
      n.statements.length > 0 &&
      n.statements[0].nodeType === ParseNodeType.Call
        ? [n.statements[0]]
        : []
    );
    expect(callNodes).toHaveLength(1);

    const argumentFillings: Map<number, ArgumentNode> = new Map();
    argumentFillings.set(functionNode.parameters[0].id, callNodes[0].arguments[0]);
    argumentFillings.set(functionNode.parameters[1].id, callNodes[0].arguments[1]);

    const valueEvaluator = createValueEvaluator(program.evaluator!);
    expect(() =>
      evaluateGraph(
        graph,
        resourceFillings,
        argumentFillings,
        {
          projectName: "project",
          stackName: "stack",
          bundleBaseDir: tmpdir,
        },
        sourceFile,
        program.evaluator!,
        valueEvaluator,
        new CodeExtractor(program.evaluator!, specialNodeMap),
        tracker
      )
    ).not.toThrow();
  } finally {
    cleanup();
    clean();
  }
});

function getSecpialNodes(typeEvaluator: TypeEvaluator, node: FunctionNode | ModuleNode) {
  const walker = new TypeSearcher(typeEvaluator, /* skipSubScope */ false);
  walker.walk(node.nodeType === ParseNodeType.Function ? node.suite : node);
  return walker.specialNodeMap;
}

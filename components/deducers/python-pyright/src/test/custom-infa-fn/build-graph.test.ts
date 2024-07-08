import { Program } from "pyright-internal/dist/analyzer/program";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { getChildNodes } from "pyright-internal/dist/analyzer/parseTreeWalker";
import { FunctionNode, ParseNodeType } from "pyright-internal/dist/parser/parseNodes";
import * as TestUtils from "../test-utils";
import { ResourceObjectTracker } from "../../resource-object-tracker";
import { buildGraphForFunction, buildGraphForModule } from "../../custom-infra-fn/build-graph";
import { RelationshipType, ResourceGraph, ResourceType } from "../../custom-infra-fn/graph-types";

describe("Graph construction for custom infra function", () => {
  const code = `
from pluto_client import Router, Queue

# resource object defined outside the function
router_global = Router("router")

def custom_infra_fn(router_param: Router, path: str):
  # call to the resource object defined outside the function
  router_global.get("/path", lambda x: x)

  # call to the resource object passed as a parameter
  router_param.get("/path", lambda x: x)

  # resource object defined inside the function
  queue = Queue("queue")
  router_internal = Router(path, queue, router_param.url(), lambda x: x)
`;

  let program: Program;
  let sourceFile: SourceFile;
  let clean: () => void;
  let graph: ResourceGraph;

  beforeAll(() => {
    const result = TestUtils.parseCode(code);
    program = result.program;
    sourceFile = result.sourceFile;
    clean = result.clean;

    const childNodes = getChildNodes(sourceFile.getParseResults()!.parseTree);
    const functionNodes = childNodes.filter((n) => n?.nodeType === ParseNodeType.Function);
    expect(functionNodes.length).toBe(1);

    const functionNode = functionNodes[0] as FunctionNode;
    const tracker = new ResourceObjectTracker(program.evaluator!);
    expect(
      () => (graph = buildGraphForFunction(program.evaluator!, tracker, functionNode))
    ).not.toThrow();
  });

  afterAll(() => {
    clean();
  });

  test("External resource object is correctly identified", () => {
    const externalRouter = graph.resources.find((r) => r.type === ResourceType.ExternalCreated);
    expect(externalRouter).toBeDefined();

    const relat = graph.relationships.find((r) => {
      return r.type === RelationshipType.Infrastructure && r.caller === externalRouter;
    });
    expect(relat).toBeDefined();
  });
});

test("should correctly get the construct node for the API call", () => {
  const code = `
from pluto_client import Router, Queue

router_global = Router("router")

def custom_infra_fn(router_param: Router, path: str):
  router_param.get("/path", lambda x: x)
  queue = Queue("queue")

  router_internal = Router(path, queue, router_param.url(), lambda x: x)
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);

  const childNodes = getChildNodes(sourceFile.getParseResults()!.parseTree);
  const functionNodes = childNodes.filter((n) => n?.nodeType === ParseNodeType.Function);
  expect(functionNodes.length === 1);

  const functionNode = functionNodes[0] as FunctionNode;
  const tracker = new ResourceObjectTracker(program.evaluator!);
  expect(() => buildGraphForFunction(program.evaluator!, tracker, functionNode)).not.toThrow();

  clean();
});

test("should correctly build the graph for the global scope", () => {
  const code = `
from pluto_client import Router, Queue

router = Router("router")
queue = Queue("queue")

router.get("/get_path", lambda x: x)

def queue_sub_handler():
  print(router.url())

queue.subscribe(queue_sub_handler)
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);

  const tracker = new ResourceObjectTracker(program.evaluator!);
  expect(() =>
    buildGraphForModule(program.evaluator!, tracker, sourceFile.getParseResults()!.parseTree)
  ).not.toThrow();

  clean();
});

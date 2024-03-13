import * as path from "path";
import { Program } from "pyright-internal/dist/analyzer/program";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { ParseNode, ParseNodeType } from "pyright-internal/dist/parser/parseNodes";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import * as TestUtils from "./test-utils";
import * as TypeUtils from "../type-utils";
import * as TypeConsts from "../type-consts";
import { ValueEvaluator } from "../value-evaluator";
import { Closure, ClosureExtractor } from "../closure-extractor";
import { ResourceObjectTracker } from "../resource-object-tracker";

const SAMPLES_ROOT = path.join(__dirname, "samples");

test("should correctly extract the closure for the most situations", () => {
  const filepath = path.join(SAMPLES_ROOT, "closure_extractor_valid.py");
  const { program, sourceFiles } = TestUtils.parseFiles([filepath]);
  expect(sourceFiles.length).toBe(1);
  const sourceFile = sourceFiles[0];

  const { specialNodeMap, extractor } = createTools(program, sourceFile);

  const constructNodes = specialNodeMap.getNodesByType(TypeConsts.IRESOURCE_FULL_NAME);
  const infraApiCalls = specialNodeMap.getNodesByType(TypeConsts.IRESOURCE_INFRA_API_FULL_NAME);

  for (const node of [constructNodes, infraApiCalls].flat()) {
    node?.arguments.forEach((arg) => {
      if (
        TypeUtils.isLambdaNode(arg.valueExpression) ||
        TypeUtils.isFunctionVar(arg.valueExpression, program.evaluator!)
      ) {
        const closure = extractor.extractClosure(arg.valueExpression, sourceFile);
        Closure.toString(closure);
      }
    });
  }
});

test("should throw an error when there is argument that cannot be evaluated", () => {
  const code = `
import random

def foo(x):
  pass

rand = random.randint()
foo(rand)
`;
  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  const { extractor } = createTools(program, sourceFile);

  const walker = new NodeFetcher([ParseNodeType.Call]);
  walker.walk(sourceFile.getParseResults()!.parseTree!);

  walker.nodes.forEach((node) => {
    if (
      node.nodeType === ParseNodeType.Call &&
      node.leftExpression.nodeType === ParseNodeType.Name &&
      node.leftExpression.value === "foo"
    ) {
      expect(() => extractor.extractClosure(node, sourceFile)).toThrow();
    }
  });

  clean();
});

test("should throw an error when the assignment statement is not a simple assignment", () => {
  const code = `
a, b = 1, 2

def foo(x):
  return x + b  # Throw an error here

foo(a)
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  const { extractor } = createTools(program, sourceFile);

  const walker = new NodeFetcher([ParseNodeType.Call]);
  walker.walk(sourceFile.getParseResults()!.parseTree!);

  walker.nodes.forEach((node) => {
    if (
      node.nodeType === ParseNodeType.Call &&
      node.leftExpression.nodeType === ParseNodeType.Name &&
      node.leftExpression.value === "foo"
    ) {
      expect(() => extractor.extractClosure(node, sourceFile)).toThrow(
        /We only support the simplest assignment statement/
      );
    }
  });

  clean();
});

function createTools(program: Program, sourceFile: SourceFile) {
  const specialNodeMap = TestUtils.getSpecialNodeMap(program, sourceFile);
  const tracker = new ResourceObjectTracker(program.evaluator!, specialNodeMap);
  const valueEvaluator = new ValueEvaluator(program.evaluator!);
  const extractor = new ClosureExtractor(program.evaluator!, tracker, valueEvaluator);
  return { specialNodeMap, tracker, valueEvaluator, extractor };
}

class NodeFetcher extends ParseTreeWalker {
  public readonly nodes: ParseNode[] = [];

  constructor(private readonly expectedNodeTypes: ParseNodeType[]) {
    super();
  }

  visit(node: ParseNode): boolean {
    if (this.expectedNodeTypes.includes(node.nodeType)) {
      this.nodes.push(node);
    }
    return true;
  }
}

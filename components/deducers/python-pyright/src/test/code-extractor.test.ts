import * as path from "path";
import { Program } from "pyright-internal/dist/analyzer/program";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ExpressionNode,
  LambdaNode,
  ParseNode,
  ParseNodeType,
} from "pyright-internal/dist/parser/parseNodes";
import * as TestUtils from "./test-utils";
import * as TypeUtils from "../type-utils";
import * as TypeConsts from "../type-consts";
import { ValueEvaluator } from "../value-evaluator";
import { CodeSegment, CodeExtractor } from "../code-extractor";
import { ResourceObjectTracker } from "../resource-object-tracker";

const SAMPLES_ROOT = path.join(__dirname, "samples");

test("should correctly extract the code segment for the most situations", () => {
  const filepath = path.join(SAMPLES_ROOT, "code_extractor_valid.py");
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
        const segment = extractor.extractExpressionRecursively(arg.valueExpression, sourceFile);
        CodeSegment.toString(segment);
      }
    });
  }
});

test("should correctly extract the code segment for the list comprehension", () => {
  const code = `
number_list = [x for x in range(10)]
nested_number_list = [[x for x in range(10)] for _ in range(10)]
multiple_for_list = [x for x in range(10) for _ in range(10)]
multiple_for_list_with_condition = [
    x for x in range(10) if x % 2 == 0 for _ in range(10)
]

def foo():
    number_list
    nested_number_list
    multiple_for_list
    multiple_for_list_with_condition

foo()
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  const { extractor } = createTools(program, sourceFile);

  const walker = new NodeFetcher((node) => {
    return (
      node.nodeType === ParseNodeType.Call &&
      node.leftExpression.nodeType === ParseNodeType.Name &&
      node.leftExpression.value === "foo"
    );
  });
  walker.walk(sourceFile.getParseResults()!.parseTree!);
  expect(walker.nodes).toHaveLength(1);

  const callNode = walker.nodes[0] as ExpressionNode;
  const segment = extractor.extractExpressionRecursively(callNode, sourceFile);

  const text = CodeSegment.toString(segment);
  code.split("\n").forEach((line) => {
    expect(text).toContain(line.trim());
  });

  clean();
});

test("should correctly extract the code segment for the binary operation", () => {
  const code = `
def format_to_openai_tool_messages(intermediate_steps):
    pass


prompt = "What is the sum of 1 and 2?"

llm_with_tools = None

OpenAIToolsAgentOutputParser = None

binary_op = 1 + 2
nested_binary_op = (1 + 2) * 3
multiple_binary_op = 1 + 2 * 3

# Copied from the langchain example.
complex_binary_op = (
    {
        "input": lambda x: x["input"],
        "agent_scratchpad": lambda x: format_to_openai_tool_messages(
            x["intermediate_steps"]
        ),
        "chat_history": lambda x: x["chat_history"],
    }
    | prompt
    # | prompt_trimmer # See comment above.
    | llm_with_tools
    | OpenAIToolsAgentOutputParser()
)


def foo():
    binary_op
    nested_binary_op
    multiple_binary_op
    complex_binary_op


foo()  
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  const { extractor } = createTools(program, sourceFile);

  const walker = new NodeFetcher((node) => {
    return (
      node.nodeType === ParseNodeType.Call &&
      node.leftExpression.nodeType === ParseNodeType.Name &&
      node.leftExpression.value === "foo"
    );
  });
  walker.walk(sourceFile.getParseResults()!.parseTree!);
  expect(walker.nodes).toHaveLength(1);

  const callNode = walker.nodes[0] as ExpressionNode;
  const segment = extractor.extractExpressionRecursively(callNode, sourceFile);

  const text = CodeSegment.toString(segment);
  code.split("\n").forEach((line) => {
    if (line.trim().startsWith("#")) {
      return;
    }
    expect(text).toContain(line.trim());
  });

  clean();
});

test("should correctly extract the dependent accessed properties when the access method is located on the right side of the assignment statement", () => {
  const code = `
from pluto_client import Router

router = Router("router")

tuple_var = (router.url(),) # The method for accessing the url is located in a tuple.

def func(*args, **kwargs):
    pass

func_result = func(router.url()) # The method for accessing the url is located in a function argument.

def foo(*args, **kwargs):
    func_result
    tuple_var

foo()
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  const { extractor } = createTools(program, sourceFile);

  const walker = new NodeFetcher((node) => {
    return (
      node.nodeType === ParseNodeType.Call &&
      node.leftExpression.nodeType === ParseNodeType.Name &&
      node.leftExpression.value === "foo"
    );
  });
  walker.walk(sourceFile.getParseResults()!.parseTree!);
  expect(walker.nodes).toHaveLength(1);

  const callNode = walker.nodes[0] as ExpressionNode;
  const segment = extractor.extractExpressionRecursively(callNode, sourceFile);

  expect(CodeSegment.getAccessedCapturedProperties(segment)).toHaveLength(2);

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

  const walker = new NodeFetcher((node) => {
    return (
      node.nodeType === ParseNodeType.Call &&
      node.leftExpression.nodeType === ParseNodeType.Name &&
      node.leftExpression.value === "foo"
    );
  });
  walker.walk(sourceFile.getParseResults()!.parseTree!);
  expect(walker.nodes).toHaveLength(1);

  const callNode = walker.nodes[0] as ExpressionNode;
  expect(() => extractor.extractExpressionRecursively(callNode, sourceFile)).toThrow(
    /We only support the simplest assignment statement/
  );

  clean();
});

test("should correctly extract the code segment for the resource object creation", () => {
  const code = `
from pluto_client import Queue

queue = Queue("queue")

def foo(*args, **kwargs):
    queue.push("message")

foo()
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  const { extractor } = createTools(program, sourceFile);

  const walker = new NodeFetcher((node) => {
    return (
      node.nodeType === ParseNodeType.Call &&
      node.leftExpression.nodeType === ParseNodeType.Name &&
      node.leftExpression.value === "foo"
    );
  });
  walker.walk(sourceFile.getParseResults()!.parseTree!);
  expect(walker.nodes).toHaveLength(1);

  const callNode = walker.nodes[0] as ExpressionNode;
  const segment = extractor.extractExpressionRecursively(callNode, sourceFile);

  expect(CodeSegment.getCalledClientApis(segment)).toHaveLength(1);
  expect(CodeSegment.toString(segment)).toContain("Queue.build_client");

  clean();
});

test("should correctly generate the export statement for multiline statements", () => {
  const code = `
def foo(*args, **kwargs):
  pass

lambda *args, **kwargs: foo("arg1", 
                            arg2="arg2")(*args, **kwargs)
`;

  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  const { extractor } = createTools(program, sourceFile);

  const walker = new NodeFetcher((node) => {
    return node.nodeType === ParseNodeType.Lambda;
  });
  walker.walk(sourceFile.getParseResults()!.parseTree!);
  expect(walker.nodes).toHaveLength(1);

  const lambdaNode = walker.nodes[0] as LambdaNode;
  const segment = extractor.extractExpressionRecursively(lambdaNode, sourceFile);

  expect(CodeSegment.toString(segment, /* exportName */ "_default")).toContain(`_default = lambda`);

  clean();
});

function createTools(program: Program, sourceFile: SourceFile) {
  const specialNodeMap = TestUtils.getSpecialNodeMap(program, sourceFile);
  const tracker = new ResourceObjectTracker(program.evaluator!, specialNodeMap);
  const valueEvaluator = new ValueEvaluator(program.evaluator!);
  const extractor = new CodeExtractor(program.evaluator!, specialNodeMap);
  return { specialNodeMap, tracker, valueEvaluator, extractor };
}

class NodeFetcher extends ParseTreeWalker {
  public readonly nodes: ParseNode[] = [];

  constructor(private readonly validator: (node: ParseNode) => boolean) {
    super();
  }

  visit(node: ParseNode): boolean {
    if (this.validator(node)) {
      this.nodes.push(node);
    }
    return true;
  }
}

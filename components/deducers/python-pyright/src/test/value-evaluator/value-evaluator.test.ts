import * as path from "path";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import {
  ExpressionNode,
  ParseNode,
  ParseNodeType,
  isExpressionNode,
} from "pyright-internal/dist/parser/parseNodes";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import * as TextUtils from "../../text-utils";
import { createValueEvaluator, LiteralValue, Value } from "../../value-evaluator/index";
import * as TestUtils from "../test-utils";

const SAMPLES_ROOT = path.join(__dirname, "samples");

const DATACLASS_DEF = `
from dataclasses import dataclass
from typing import Literal


@dataclass
class Base:
    name: str
    age: int


@dataclass
class Model:
    base: Base
    gender: Literal["male", "female"]
    nullable: int | None = None
    tup: tuple[int, int, int] = (1, 2, 3)
`;

test("should correctly evaluate the value of a local variable", () => {
  const code = `
import os

global_var = "!"  # depends on the global variable

# Environment variable
env_var = os.environ["ENV_VAR"]

def foo(arg: str = "Hello"):
    # Format string
    only_field_format_str = f"{arg}"
    field_at_the_head = f"{arg} World"
    field_at_the_tail = f"Hello {arg}"
    field_at_the_middle = f"Hello {arg} World"
    field_with_global_var = f"World {global_var}"

    # Add operation
    add_result = (
        only_field_format_str
        + field_at_the_head
        + field_at_the_tail
        + field_at_the_middle
        + field_with_global_var
    )

    # Tuple
    tup = (add_result, arg)

    # None
    none = None

    # Dictionary
    to_be_evaluated = {"arg": arg, "tup": tup, "none": None, "env": env_var}
`;
  process.env["ENV_VAR"] = "PLUTO_TEST";

  testInlineCode(code, (typeEvaluator, sourceFile) => {
    const engine = createValueEvaluator(typeEvaluator);

    return (node) => {
      const text = TextUtils.getTextOfNode(node, sourceFile);
      if (text?.startsWith("to_be_evaluated")) {
        engine.printValueTree(node);

        const placeholderNodes = engine.getPlaceholders(node);
        expect(placeholderNodes).toHaveLength(1);

        const fillings = new Map<number, Value>();

        const value = engine.evaluate(node, fillings);
        const jsonified = Value.toJson(value);
        expect(jsonified).toEqual(
          `{"arg":"Hello","tup":["HelloHello WorldHello HelloHello Hello WorldWorld !","Hello"],"none":null,"env":"PLUTO_TEST"}`
        );

        fillings.set(placeholderNodes[0].id, LiteralValue.create("hello"));
        const value2 = engine.evaluate(node, fillings);
        const jsonified2 = Value.toJson(value2);
        expect(jsonified2).toEqual(
          `{"arg":"hello","tup":["hellohello WorldHello helloHello hello WorldWorld !","hello"],"none":null,"env":"PLUTO_TEST"}`
        );
      }
    };
  });
});

test("should throw an error when there is no filling for a placeholder", () => {
  const code = `
def foo(arg: str):
    to_be_evaluated = arg + " world"
`;

  testInlineCode(code, (typeEvaluator, sourceFile) => {
    const engine = createValueEvaluator(typeEvaluator);

    return (node) => {
      const text = TextUtils.getTextOfNode(node, sourceFile);
      if (!text?.startsWith("to_be_evaluated")) {
        return;
      }

      const placeholderNodes = engine.getPlaceholders(node);
      expect(placeholderNodes).toHaveLength(1);

      // empty fillings
      const fillings = new Map<number, Value>();
      expect(() => engine.evaluate(node, fillings)).toThrow();
    };
  });
});

type Validator = (node: ExpressionNode) => void;

class ExpressionWalker extends ParseTreeWalker {
  constructor(
    private readonly sourceFile: SourceFile,
    private readonly validator: Validator
  ) {
    super();
  }

  override visit(node: ParseNode): boolean {
    switch (node.nodeType) {
      // case ParseNodeType.Function:
      case ParseNodeType.Parameter:
      case ParseNodeType.Import:
      case ParseNodeType.ImportAs:
      case ParseNodeType.ImportFrom:
      case ParseNodeType.ImportFromAs:
      case ParseNodeType.Class:
      case ParseNodeType.Lambda:
        return false;
    }

    if (isExpressionNode(node)) {
      this.evaluateValue(node);
      return true;
    }
    return true;
  }

  private evaluateValue(node: ExpressionNode) {
    const nodeText = TextUtils.getTextOfNode(node, this.sourceFile);
    if (nodeText?.startsWith("fn_")) {
      // Skip the function calls.
      return;
    }

    this.validator(node);
  }
}

function testInlineCode(
  code: string,
  validatorBuilder: (typeEvaluator: TypeEvaluator, sourceFile: SourceFile) => Validator
) {
  const { program, sourceFile, clean } = TestUtils.parseCode(code);

  const parseTree = sourceFile.getParseResults()?.parseTree;
  expect(parseTree).toBeDefined();

  const walker = new ExpressionWalker(sourceFile, validatorBuilder(program.evaluator!, sourceFile));

  try {
    walker.walk(parseTree!);
  } finally {
    clean();
  }
}

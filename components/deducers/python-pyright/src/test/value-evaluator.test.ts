import * as path from "path";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ExpressionNode,
  ParseNode,
  ParseNodeType,
  isExpressionNode,
} from "pyright-internal/dist/parser/parseNodes";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { Value, ValueEvaluator } from "../value-evaluator";
import * as TextUtils from "../text-utils";
import * as TestUtils from "./test-utils";

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
      case ParseNodeType.Function:
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
      return false;
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

test("ValueEvaluator should correctly evaluate the values", () => {
  // Set up
  const samplePath = path.join(SAMPLES_ROOT, "value_evaluator_valid.py");
  const { program, sourceFiles } = TestUtils.parseFiles([samplePath]);

  // Ensure there is only one source file
  expect(sourceFiles.length).toEqual(1);

  // Get the parse tree of the source file
  const parseTree = sourceFiles[0].getParseResults()?.parseTree;
  expect(parseTree).toBeDefined();

  const valueEvaluator = new ValueEvaluator(program.evaluator!);

  const walker = new ExpressionWalker(sourceFiles[0]!, (node) => {
    const value = valueEvaluator.getValue(node);
    expect(value).toBeDefined();
  });
  walker.walk(parseTree!);
});

describe("evaluateValueForBuiltin", () => {
  test("should throw an error when try to deducer a non-literal type", () => {
    const code = `
from typing import Any
import random

var_0: Any = 1
var_1 = random.randint(1, 10)
var_2 = 1.0
var_3 = bytearray(b"bytearr")
var_4 = b"bytes"
var_5 = {"a": 1}
var_7 = frozenset([1])
var_8 = [1]
var_9 = {1}
`;

    testInlineCode(code, (valueEvaluator, sourceFile) => {
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text?.startsWith("var_")) {
          expect(() => valueEvaluator.getValue(node)).toThrow();
        }
      };
    });
  });
});

describe("evaluateValueForTuple", () => {
  test("should throw an error when a type argument is not of category Class", () => {
    const code = `
${DATACLASS_DEF}

from typing import Any

any_var: Any = 1
tuple_1 = (any_var, 2, 3)

model = Base(name="John", age=25)
tuple_2 = (model,)
`;

    testInlineCode(code, (valueEvaluator, sourceFile) => {
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text?.startsWith("tuple_") || /^\(.*\)$/g.test(text!)) {
          expect(() => valueEvaluator.getValue(node)).toThrow();
        }
      };
    });
  });
});

describe("evaluateValueForDataClass", () => {
  test("should throw an error when try to deducer a data class instance", () => {
    const code = `
${DATACLASS_DEF}

model = Model(Base("name", 25), gender="male")
`;

    testInlineCode(code, (valueEvaluator, sourceFile) => {
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text === "model") {
          expect(() => valueEvaluator.getValue(node)).toThrow();
        }

        if (text === 'Model(Base("name", 25), gender="male")') {
          const value = valueEvaluator.getValue(node);
          expect(value).toBeDefined();

          const stringified = Value.toString(value);
          expect(stringified.startsWith("tmp.Model")).toBeTruthy();

          const match = stringified.match(/\(.*\)/);
          expect(match).not.toBeNull();
          expect(match![0]).toContain('base=tmp.Base(name="name", age=25)');
          expect(match![0]).toContain('gender="male"');
          expect(match![0]).toContain("nullable=None");
          expect(match![0]).toContain("tup=(1, 2, 3)");
        }
      };
    });
  });
});

function testInlineCode(
  code: string,
  validatorBuilder: (evaluator: ValueEvaluator, sourceFile: SourceFile) => Validator
) {
  const { program, sourceFile, clean } = TestUtils.parseCode(code);

  const parseTree = sourceFile.getParseResults()?.parseTree;
  expect(parseTree).toBeDefined();

  const valueEvaluator = new ValueEvaluator(program.evaluator!);
  const walker = new ExpressionWalker(sourceFile, validatorBuilder(valueEvaluator, sourceFile));
  walker.walk(parseTree!);

  clean();
}

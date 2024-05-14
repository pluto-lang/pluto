import assert from "assert";
import * as path from "path";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ExpressionNode,
  ParseNode,
  ParseNodeType,
  isExpressionNode,
} from "pyright-internal/dist/parser/parseNodes";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { Value, ValueEvaluator, ValueType } from "../value-evaluator";
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
  test("should throw an error when try to deduce a non-literal type", () => {
    const code = `
from typing import Any
import random

var_0: Any = 1
var_1 = random.randint(1, 10)
# var_2 = 1.0 supported
var_3 = bytearray(b"bytearr")
var_4 = b"bytes"
# var_5 = {"a": 1} supported
var_7 = frozenset([1])
var_8 = [1]
var_9 = {1}
`;

    testInlineCode(code, (valueEvaluator, sourceFile) => {
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text?.startsWith("var_")) {
          const n = node;
          expect(() => valueEvaluator.getValue(n)).toThrow();
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

any_var: Any = 1 # Do not support for the assignment with type annotation
tuple_1 = (any_var, 2, 3)
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
  test("should correctly evaluate a data class instance", () => {
    const code = `
${DATACLASS_DEF}

model = Model(Base("name", 25), gender="male")
`;

    testInlineCode(code, (valueEvaluator, sourceFile) => {
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text === "model") {
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

describe("evaluate value about environment variable accessing", () => {
  test("should correctly evaluate the direct access to an environment variable", () => {
    const code = `
import os

var_1 = os.environ["KEY"]
var_2 = os.environ.get("KEY")
var_3 = os.environ.get("KEY", "DEFAULT_VALUE")
`;

    testInlineCode(code, (valueEvaluator, sourceFile) => {
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text?.startsWith("var_")) {
          const value = valueEvaluator.getValue(node);
          expect(value).toBeDefined();
          expect(value.valueType).toEqual(ValueType.EnvVarAccess);
          assert(value.valueType === ValueType.EnvVarAccess);
          expect(value.envVarName).toEqual("KEY");

          if (text === "var_3") {
            expect(value.defaultEnvVarValue).toEqual("DEFAULT_VALUE");
          }
        }
      };
    });
  });

  test("should correctly evaluate the nested access to an environment variable", () => {
    const code = `
${DATACLASS_DEF}
import os

var_tuple = (os.environ["KEY"],)
var_dict = {"key": os.environ["KEY"], "key2": {"key3": os.environ.get("KEY")}}
var_dataclass = Model(Base("name", 25), gender=os.environ["KEY"])

var_complex = (
    os.environ["KEY"],
    Base(os.environ.get("KEY"), 25),
    os.environ.get("KEY", "DEFAULT_VALUE"),
    None,
    { "key": os.environ["KEY"], "key2": os.environ.get("KEY") },
)
`;

    testInlineCode(code, (valueEvaluator, sourceFile) => {
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text?.startsWith("var_")) {
          const value = valueEvaluator.getValue(node);
          expect(value).toBeDefined();
        }

        if (text === "var_complex") {
          const value = valueEvaluator.getValue(node);
          expect(value).toBeDefined();
          expect(value.valueType).toEqual(ValueType.Tuple);

          const serialized = Value.toJson(value);
          expect(serialized).toContain('os.environ.get("KEY")');
          expect(serialized).toContain('{"name": os.environ.get("KEY"), "age": 25}');
          expect(serialized).toContain('os.environ.get("KEY", "DEFAULT_VALUE")');

          const types = Value.getTypes(value);
          expect(types).toHaveLength(1);
          expect(types[0]).toEqual("tmp.Base");
        }
      };
    });
  });
});

describe("evaluateValueForVariable", () => {
  test("should correctly evaluate the variable assignment", () => {
    const code = `
${DATACLASS_DEF}
import os

common_var_1 = 1
common_var_2 = Model(Base("name", 25), gender=os.environ["KEY"])

var_1 = common_var_1
var_2 = common_var_1 + 1

var_tuple = (common_var_1, common_var_1 + 1, common_var_2)
var_dict = {"key": common_var_1, "key2": common_var_1 + 1, "key3": common_var_2}
var_dataclass = Base("name", common_var_1)
`;

    testInlineCode(code, (valueEvaluator, sourceFile) => {
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text?.startsWith("var_")) {
          const value = valueEvaluator.getValue(node);
          expect(value).toBeDefined();

          switch (text) {
            case "var_1":
              expect(Value.toString(value)).toEqual("1");
              break;
            case "var_2":
              expect(Value.toString(value)).toEqual("2");
              break;
            case "var_tuple":
              expect(Value.toString(value)).toEqual(
                '(1, 2, tmp.Model(nullable=None, tup=(1, 2, 3), base=tmp.Base(name="name", age=25), gender=os.environ.get("KEY")))'
              );
              break;
            case "var_dict":
              expect(Value.toString(value)).toEqual(
                '{"key": 1, "key2": 2, "key3": tmp.Model(nullable=None, tup=(1, 2, 3), base=tmp.Base(name="name", age=25), gender=os.environ.get("KEY"))}'
              );
              break;
            case "var_dataclass":
              expect(Value.toString(value)).toEqual('tmp.Base(name="name", age=1)');
              break;
          }
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

  try {
    walker.walk(parseTree!);
  } finally {
    clean();
  }
}

import * as path from "path";
import {
  ArgumentNode,
  ExpressionNode,
  ParseNodeType,
} from "pyright-internal/dist/parser/parseNodes";
import * as TextUtils from "../../text-utils";
import { genEnvVarAccessTextForPython, Value, ValueEvaluator } from "../../value-evaluator";
import { DATACLASS_DEF } from "./dataclass.test";
import { testInlineCode, testPyFile } from "./utils";

const SAMPLES_ROOT = path.join(__dirname, "../samples");

describe("Evaluate the value of a local variable", () => {
  const code = `
import os

global_var = "!"  # depends on the global variable

# Environment variable
env_var = os.environ["ENV_VAR"]

def foo(arg: str = "Hello"):
    # Number
    num = 123
    float_num = 123.456

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
    num_add_result = num + float_num

    # Tuple
    tup = (add_result, arg)

    # None
    none = None

    # Dictionary
    to_be_evaluated = {
        "arg": arg, 
        "tup": tup, 
        "none": None, 
        "env": env_var, 
        "number": num_add_result
    }

foo("hello")
`;

  let toBeEvaluatedNode: ExpressionNode | undefined;
  let argumentNode: ArgumentNode | undefined;
  let valueEvaluator: ValueEvaluator | undefined;

  beforeAll(() => {
    process.env["ENV_VAR"] = "PLUTO_TEST";

    testInlineCode(code, (evaluator, sourceFile) => {
      valueEvaluator = evaluator;
      return (node) => {
        const text = TextUtils.getTextOfNode(node, sourceFile);
        if (text?.startsWith("to_be_evaluated")) {
          // Get the local variable to be evaluated
          toBeEvaluatedNode = node;
        } else if (text === 'foo("hello")' && node.nodeType === ParseNodeType.Call) {
          // Get the argument of the function call
          argumentNode = node.arguments[0];
        }
      };
    });

    // Check if the nodes are found
    expect(toBeEvaluatedNode).toBeDefined();
    expect(argumentNode).toBeDefined();
    expect(valueEvaluator).toBeDefined();
  });

  test("should correctly evaluate the value of the local variable with no fillings", () => {
    const value = valueEvaluator!.evaluate(toBeEvaluatedNode!);
    const jsonified = Value.toJson(value);
    expect(jsonified).toContain(
      `{"arg":"Hello","tup":["HelloHello WorldHello HelloHello Hello WorldWorld !","Hello"],"none":null,"env":"PLUTO_TEST","number":246.456`
    );
  });

  test("should correctly evaluate the value of the local variable with fillings", () => {
    const placeholderNodes = valueEvaluator!.getPlaceholders(toBeEvaluatedNode!);
    expect(placeholderNodes).toHaveLength(1);

    const fillings = new Map<number, ArgumentNode>();
    fillings.set(placeholderNodes[0].id, argumentNode!);
    const value2 = valueEvaluator!.evaluate(toBeEvaluatedNode!, fillings);
    const jsonified2 = Value.toJson(value2);
    expect(jsonified2).toContain(
      `{"arg":"hello","tup":["hellohello WorldHello helloHello hello WorldWorld !","hello"],"none":null,"env":"PLUTO_TEST","number":246.456`
    );
  });
});

test("should throw an error when trying to evaluate the value of a local variable that has multiple declarations", () => {
  const code = `
def foo(arg: str = "Hello"):
    arg = arg + " World"
    to_be_evaluated = arg

arg = "Hello"
arg = arg + " World"
to_be_evaluated = arg
`;
  testInlineCode(code, (valueEvaluator, sourceFile) => {
    return (node) => {
      const text = TextUtils.getTextOfNode(node, sourceFile);
      if (text?.startsWith("to_be_evaluated")) {
        expect(() => valueEvaluator.evaluate(node)).toThrow(/multiple declarations/);
      }
    };
  });
});

test("should throw an error when there is no filling for a placeholder", () => {
  const code = `
def foo(arg: str):
    to_be_evaluated = arg + " world"
`;

  testInlineCode(code, (valueEvaluator, sourceFile) => {
    return (node) => {
      const text = TextUtils.getTextOfNode(node, sourceFile);
      if (!text?.startsWith("to_be_evaluated")) {
        return;
      }

      const placeholderNodes = valueEvaluator.getPlaceholders(node);
      expect(placeholderNodes).toHaveLength(1);

      expect(() => valueEvaluator.evaluate(node)).toThrow();
    };
  });
});

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
        const value = valueEvaluator.evaluate(node, new Map());
        expect(value).toBeDefined();

        switch (text) {
          case "var_1":
            expect(Value.toString(value)).toEqual("1");
            break;
          case "var_2":
            expect(Value.toString(value)).toEqual("2");
            break;
          case "var_tuple":
            expect(
              Value.toString(value, { genEnvVarAccessText: genEnvVarAccessTextForPython })
            ).toEqual(
              '(1, 2, tmp.Model(nullable=None, tup=(1, 2, 3), base=tmp.Base(name="name", age=25), gender=os.environ.get("KEY")))'
            );
            break;
          case "var_dict":
            expect(
              Value.toString(value, { genEnvVarAccessText: genEnvVarAccessTextForPython })
            ).toEqual(
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

test("should throw an error when try to deduce a non-literal type", () => {
  const code = `
from typing import Any
import random

# var_0: Any = 1 supported
var_1 = random.randint(1, 10)
# var_2 = 1.0 supported
var_3 = bytearray(b"bytearr")
# var_4 = b"bytes"
# var_5 = {"a": 1} supported
var_7 = frozenset([1])
var_8 = [1]
var_9 = {1}
`;

  testInlineCode(code, (valueEvaluator, sourceFile) => {
    return (node) => {
      const text = TextUtils.getTextOfNode(node, sourceFile);
      if (text?.startsWith("var_")) {
        expect(() => valueEvaluator.evaluate(node, new Map())).toThrow();
      }
    };
  });
});

test("should correctly evaluate the values", () => {
  const samplePath = path.join(SAMPLES_ROOT, "value_evaluator_valid.py");
  testPyFile(samplePath, (valueEvaluator) => {
    return (node) => {
      const value = valueEvaluator.evaluate(node, new Map());
      expect(value).toBeDefined();
    };
  });
});

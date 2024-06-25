import assert from "assert";
import * as TextUtils from "../../text-utils";
import { Value, ValueType } from "../../value-evaluator";
import { genEnvVarAccessTextForPython } from "../../value-evaluator/utils";
import { DATACLASS_DEF } from "./dataclass.test";
import { testInlineCode } from "./utils";

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
        const value = valueEvaluator.evaluate(node, new Map());
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
        const value = valueEvaluator.evaluate(node, new Map());
        expect(value).toBeDefined();
      }

      if (text === "var_complex") {
        const value = valueEvaluator.evaluate(node, new Map());
        expect(value).toBeDefined();
        expect(value.valueType).toEqual(ValueType.Tuple);

        const serialized = Value.toJson(value, {
          genEnvVarAccessText: genEnvVarAccessTextForPython,
        });
        expect(serialized).toContain('os.environ.get("KEY")');
        expect(serialized).toContain('{"name":os.environ.get("KEY"),"age":25}');
        expect(serialized).toContain('os.environ.get("KEY","DEFAULT_VALUE")');

        const types = Value.getTypes(value);
        expect(types).toHaveLength(1);
        expect(types[0]).toEqual("tmp.Base");
      }
    };
  });
});

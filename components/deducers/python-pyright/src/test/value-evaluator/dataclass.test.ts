import * as TextUtils from "../../text-utils";
import { Value } from "../../value-evaluator";
import { testInlineCode } from "./utils";

export const DATACLASS_DEF = `
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

test("should correctly evaluate a data class instance", () => {
  const code = `
${DATACLASS_DEF}

model = Model(Base("name", 25), gender="male")
`;

  testInlineCode(code, (valueEvaluator, sourceFile) => {
    return (node) => {
      const text = TextUtils.getTextOfNode(node, sourceFile);
      if (text === "model") {
        const value = valueEvaluator.evaluate(node, new Map());
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

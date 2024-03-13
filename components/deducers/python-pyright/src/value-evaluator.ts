import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { ExpressionNode, ParseNodeType } from "pyright-internal/dist/parser/parseNodes";
import { ClassType, LiteralValue, TypeCategory } from "pyright-internal/dist/analyzer/types";
import * as TypeUtils from "./type-utils";

export interface Value {
  /**
   * If the type is undefined, it means the value is a primitive, including boolean, integer,
   * string, and float.
   */
  type?: string;

  value?: LiteralValue | Record<string, Value> | Array<Value>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Value {
  export function toString(value: Value, containModuleName: boolean = true): string {
    if (value.type === undefined) {
      // This is a primitive. We can directly return the JSON stringified value.
      return JSON.stringify(value.value);
    }

    if (value.type === "types.NoneType") {
      return "None";
    }

    switch (value.type) {
      case "builtins.tuple": {
        const values = value.value! as Value[];
        return `(${values.map((v) => Value.toString(v)).join(", ")})`;
      }
      default: {
        // This is a data class object.
        const type = containModuleName ? value.type : value.type.split(".").pop()!;
        const values = value.value! as Record<string, Value>;
        const params = Object.entries(values)
          .map(([k, v]) => `${k}=${Value.toString(v)}`)
          .join(", ");
        return `${type}(${params})`;
      }
    }
  }

  /**
   * Get all the types contained in the value.
   */
  export function getTypes(value: Value): string[] {
    const types: string[] = [];
    if (value.type) {
      types.push(value.type);
    }
    if (value.value) {
      if (Array.isArray(value.value)) {
        value.value.forEach((v) => {
          types.push(...getTypes(v));
        });
      } else {
        Object.values(value.value).forEach((v) => {
          types.push(...getTypes(v));
        });
      }
    }
    return types;
  }
}

/**
 * This class evaluates the value of an expression node.
 *
 * For now, we're only able to evaluate the values of literal types and direct calls to data class
 * constructors. There are a couple of scenarios where we hit a brick wall:
 *
 *   1. Values that could change on the fly — think of those unpredictable elements like the output
 *      from a random function or a timestamp. We just can't evaluate their values during static
 *      analysis.
 *   2. Values that shift depending on where you are in the call chain, such as the arguments
 *      accessed within a function. Take the example below: we're building a resource object inside
 *      a function body, and there's just no way for us to deduce the actual value of the variable
 *      fed into the constructor, which in this case is `queueName`.
 *      ```python
 *        def createQueue(queueName: str):
 *          return Queue(queueName)
 *      ```
 *
 * In the first scenario, since we can't determine the real-time values during static analysis,
 * we'll throw an error to flag it. As for the second, we're going to need future updates to trace
 * through the call chains and make sense of those values.
 */
export class ValueEvaluator {
  constructor(private readonly typeEvaluator: TypeEvaluator) {}

  public getValue(valueNode: ExpressionNode): Value {
    // If the node is a literal, we can directly return the value.
    switch (valueNode.nodeType) {
      case ParseNodeType.Number:
        return { value: valueNode.value };
      case ParseNodeType.String:
        return { value: valueNode.value };
    }

    // Currently, we only support the variable of literal type. So, we can get the literal value
    // from the type of the variable.
    const valueType = this.typeEvaluator.getType(valueNode);
    if (valueType === undefined) {
      throw new Error(`Cannot determine the type of this node; its type is ${valueNode.nodeType}`);
    }

    if (valueType.category !== TypeCategory.Class) {
      // If the type is not a class, it must not be a literal type or a data class type.
      throw new Error(
        `Unable to evaluate the value of the '${TypeUtils.getTypeName(valueType)}' type variable.`
      );
    }

    return this.evaluateValue(valueType, valueNode);
  }

  private evaluateValue(type: ClassType, valueNode?: ExpressionNode): Value {
    const typeFullName = type.details.fullName;

    if (ClassType.isBuiltIn(type, "NoneType")) {
      return { type: typeFullName };
    }

    if (ClassType.isBuiltIn(type)) {
      return this.evaluateValueForBuiltin(type, valueNode);
    }

    if (ClassType.isDataClass(type) && valueNode) {
      return this.evaluateValueForDataClass(type, valueNode);
    }

    throw new Error(
      `Currently, we only support literal types and direct calls to data class constructors. The value of a variable with the type '${typeFullName}' cannot be evaluated yet.`
    );
  }

  private evaluateValueForBuiltin(type: ClassType, valueNode?: ExpressionNode): Value {
    const typeFullName = type.details.fullName;

    let finalValue: Value | undefined;
    switch (type.details.fullName) {
      case "builtins.bool":
      case "builtins.int":
      case "builtins.str":
        if (type.literalValue === undefined) {
          // This is a builtin type, but not a literal type.
          throw new Error(
            `Currently, we only support bool, int, and str literals as arguments. The '${typeFullName}' is a builtin type, but not a literal type.`
          );
        }
        finalValue = { value: type.literalValue };
        break;

      case "builtins.tuple":
        finalValue = this.evaluateValueForTuple(type, valueNode);
        break;
      case "builtins.float":
      case "builtins.bytearray":
      case "builtins.bytes":
      case "builtins.dict":
      case "builtins.frozenset":
      case "builtins.list":
      case "builtins.set":
        throw new Error(
          `We don't support type '${typeFullName}' as argument yet. Currently, we only support bool, int, and str literals as arguments.`
        );
    }
    return finalValue!;
  }

  /**
   * For the tuple type, if the expression node is a tuple construction expression, we'll evaluate
   * the value of each child expression in the tuple. If it's a tuple variable, we'll attempt to
   * evaluate its value based on its type.
   */
  private evaluateValueForTuple(type: ClassType, valueNode?: ExpressionNode): Value {
    const values: Value[] = [];
    if (valueNode && valueNode.nodeType === ParseNodeType.Tuple) {
      // The expression node is a tuple construction expression.
      valueNode.expressions.forEach((expression) => {
        values.push(this.getValue(expression));
      });
    } else {
      // The expression node is a variable of tuple type.
      const tupleTypeArguments = type.tupleTypeArguments!;
      tupleTypeArguments.forEach((type) => {
        if (type.type.category !== TypeCategory.Class) {
          throw new Error(`We don't support the type '${TypeUtils.getTypeName(type.type)}' yet.`);
        }

        // Here, we have no way to access the expression node corresponding to the `type.type`,
        // because the argument `valueNode` is a tuple variable, not the tuple construction
        // expression.
        values.push(this.evaluateValue(type.type));
      });
    }
    return { type: type.details.fullName, value: values };
  }

  /**
   * For the data class type, we extract the values of this instance to a dictionary. The values
   * include the arguments passed to the constructor and the default values of the data class.
   */
  private evaluateValueForDataClass(type: ClassType, valueNode: ExpressionNode): Value {
    if (valueNode.nodeType !== ParseNodeType.Call) {
      /**
       * We can deduce the cases as shown the first and second lines of the code below. However, the
       * third line is not supported. Therefore, if we encounter a situation where we need to deduce
       * the data class instance but not the constructor, we'll throw an error.
       * ```
       * var1 = BaseModel(param=1)
       * var2 = TopModel(base=BaseModel(param=1))
       * var3 = TopModel(base=var1)
       * ```
       */
      throw new Error(
        `We only support deducing the data class constructor directly, not the instance of the data class. This is because the instance of the data class may change its value after the constructor.`
      );
    }

    const values: Record<string, Value> = {};

    // If the data class has default values, we evaluate the default values first.
    const entries = ClassType.getDataClassEntries(type);
    entries.forEach((entry) => {
      if (entry.hasDefault) {
        const name = entry.name;
        values[name] = this.getValue(entry.defaultValueExpression!);
      }
    });

    // Then we evaluate the values of the arguments passed to the constructor.
    valueNode.arguments.forEach((arg, idx) => {
      const name = arg.name?.value ?? entries[idx].name;
      values[name] = this.getValue(arg.valueExpression);
    });

    return { type: type.details.fullName, value: values };
  }
}

import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import {
  CallNode,
  DictionaryNode,
  ExpressionNode,
  IndexNode,
  NameNode,
  ParseNodeType,
  TupleNode,
} from "pyright-internal/dist/parser/parseNodes";
import {
  ClassType,
  LiteralValue as LiteralTypes,
  TypeCategory,
} from "pyright-internal/dist/analyzer/types";
import * as TypeUtils from "./type-utils";

export enum ValueType {
  None = "none",
  Literal = "literal",
  DataClass = "dataclass",
  Tuple = "tuple",
  Dict = "dict",
  EnvVarAccess = "envVarAccess",
}

interface ValueBase {
  readonly valueType: ValueType;
}

interface NoneValue extends ValueBase {
  readonly valueType: ValueType.None;
}

interface LiteralValue extends ValueBase {
  readonly valueType: ValueType.Literal;
  readonly value: LiteralTypes;
}

interface DataClassValue extends ValueBase {
  readonly valueType: ValueType.DataClass;
  readonly classType: string;
  readonly value: Record<string, Value>;
}

interface TupleValue extends ValueBase {
  readonly valueType: ValueType.Tuple;
  readonly value: Value[];
}

interface DictValue extends ValueBase {
  readonly valueType: ValueType.Dict;
  readonly value: [Value, Value][];
}

interface EnvVarAccessValue extends ValueBase {
  readonly valueType: ValueType.EnvVarAccess;
  readonly envVarName: string;
  readonly defaultEnvVarValue?: string;
}

export type Value =
  | NoneValue
  | LiteralValue
  | DataClassValue
  | TupleValue
  | DictValue
  | EnvVarAccessValue;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Value {
  interface ToStringOptions {
    /**
     * Whether to contain the module name in the output string. @default true
     */
    containModuleName?: boolean;
  }

  export function toString(value: Value, options: ToStringOptions = {}): string {
    options.containModuleName = options.containModuleName ?? true;

    type toStringHandler<T extends Value> = (value: T) => string;
    const toStringHandlers: Record<ValueType, toStringHandler<any>> = {
      [ValueType.None]: () => {
        return "None";
      },
      [ValueType.Literal]: (value: LiteralValue) => {
        return JSON.stringify(value.value);
      },
      [ValueType.Tuple]: (value: TupleValue) => {
        return `(${value.value.map((v) => Value.toString(v, options)).join(", ")})`;
      },
      [ValueType.Dict]: (value: DictValue) => {
        const kvs = value.value.map(
          ([k, v]) => `${Value.toString(k, options)}: ${Value.toString(v, options)}`
        );
        return `{${kvs.join(", ")}}`;
      },
      [ValueType.DataClass]: (value: DataClassValue) => {
        const type = options?.containModuleName
          ? value.classType
          : value.classType.split(".").pop()!;
        const params = Object.entries(value.value)
          .map(([k, v]) => `${k}=${Value.toString(v, options)}`)
          .join(", ");
        return `${type}(${params})`;
      },
      [ValueType.EnvVarAccess]: (value: EnvVarAccessValue) => {
        const envVarName = value.envVarName;
        if (value.defaultEnvVarValue) {
          return `os.environ.get("${envVarName}", "${value.defaultEnvVarValue}")`;
        }
        return `os.environ.get("${envVarName}")`;
      },
    };

    const handler = toStringHandlers[value.valueType];
    if (!handler) {
      throw new Error(`Unable reach here: ${value}`);
    }
    return handler(value);
  }

  interface ToJsonOptions {
    /**
     * The target language to generate the JSON string. @default "python"
     */
    language?: "python" | "typescript";
  }

  export function toJson(value: Value, options: ToJsonOptions = {}): string {
    options.language = options.language ?? "python";

    type toJsonHandler<T extends Value> = (value: T) => string;
    const toJsonHandlers: Record<ValueType, toJsonHandler<any>> = {
      [ValueType.None]: () => {
        return "null";
      },
      [ValueType.Literal]: (value: LiteralValue) => {
        return JSON.stringify(value.value);
      },
      [ValueType.Tuple]: (value: TupleValue) => {
        const values = value.value.map((v) => Value.toJson(v, options));
        return `[${values.join(", ")}]`;
      },
      [ValueType.Dict]: (value: DictValue) => {
        const kvs = value.value.map(
          ([k, v]) => `${Value.toJson(k, options)}: ${Value.toJson(v, options)}`
        );
        return `{${kvs.join(", ")}}`;
      },
      [ValueType.DataClass]: (value: DataClassValue) => {
        const values = value.value;
        const params = Object.entries(values)
          .map(([k, v]) => `"${k}": ${Value.toJson(v, options)}`)
          .join(", ");
        return `{${params}}`;
      },
      [ValueType.EnvVarAccess]: (value: EnvVarAccessValue) => {
        const envVarName = value.envVarName;
        if (value.defaultEnvVarValue) {
          switch (options?.language) {
            case "python":
              return `os.environ.get("${envVarName}", "${value.defaultEnvVarValue}")`;
            case "typescript":
              return `(process.env["${envVarName}"] ?? "${value.defaultEnvVarValue}")`;
            default:
              throw new Error(`Unsupported language: ${options?.language}`);
          }
        }

        switch (options?.language) {
          case "python":
            return `os.environ.get("${envVarName}")`;
          case "typescript":
            return `process.env["${envVarName}"]`;
          default:
            throw new Error(`Unsupported language: ${options?.language}`);
        }
      },
    };

    const handler = toJsonHandlers[value.valueType];
    if (!handler) {
      throw new Error(`Unable reach here: ${value}`);
    }
    return handler(value);
  }

  /**
   * Get all the types contained in the value.
   */
  export function getTypes(value: Value): string[] {
    const types: string[] = [];
    switch (value.valueType) {
      case ValueType.None:
      case ValueType.Literal:
      case ValueType.EnvVarAccess:
        break;
      case ValueType.Dict:
        value.value.forEach(([k, v]) => {
          types.push(...getTypes(k));
          types.push(...getTypes(v));
        });
        break;
      case ValueType.Tuple:
        value.value.forEach((v) => {
          types.push(...getTypes(v));
        });
        break;
      case ValueType.DataClass:
        types.push(value.classType);
        Object.values(value.value).forEach((v) => {
          types.push(...getTypes(v));
        });
        break;
      default:
        throw new Error(`Unable reach here: ${value}`);
    }
    return types;
  }
}

/**
 * This class evaluates the value of an expression node.
 *
 * At present, we are only capable of evaluating the values pertaining to literal types, data class
 * constructors, and environment variable accesses. We offer support for both direct invocation and
 * variable access. However, it's crucial that the variable is assigned just once, and the value
 * should be directly assigned, not via tuple assignment or accompanied with type annotations.
 *
 * There are a couple of scenarios where we hit a brick wall:
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
    switch (valueNode.nodeType) {
      case ParseNodeType.Number:
        return { valueType: ValueType.Literal, value: valueNode.value };
      case ParseNodeType.String:
        return { valueType: ValueType.Literal, value: valueNode.value };
      case ParseNodeType.Name:
        return this.evaluateValueForVariable(valueNode);
      case ParseNodeType.Call:
        return this.evaluateValueForCall(valueNode);
      case ParseNodeType.Index:
        return this.evaluateValueForIndex(valueNode);
      case ParseNodeType.Tuple:
        return this.evaluateValueForTuple(valueNode);
      case ParseNodeType.Dictionary:
        return this.evaluateValueForDict(valueNode);
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

    return this.evaluateValueByClassType(valueType, valueNode);
  }

  private evaluateValueByClassType(type: ClassType, valueNode: ExpressionNode): Value {
    const typeFullName = type.details.fullName;

    if (ClassType.isBuiltIn(type, "NoneType")) {
      return { valueType: ValueType.None };
    }

    if (ClassType.isBuiltIn(type)) {
      return this.evaluateValueForBuiltin(type);
    }

    if (ClassType.isDataClass(type) && valueNode) {
      return this.evaluateValueForDataClass(type, valueNode);
    }

    throw new Error(
      `Currently, we only support literal types and direct calls to data class constructors. The value of a variable with the type '${typeFullName}' cannot be evaluated yet.`
    );
  }

  private evaluateValueForBuiltin(type: ClassType): Value {
    const typeFullName = type.details.fullName;

    let finalValue: Value | undefined;
    switch (type.details.fullName) {
      case "builtins.bool":
      case "builtins.int":
      case "builtins.str":
        if (type.literalValue === undefined) {
          // This is a builtin type, but cannot determine the literal value.
          throw new Error(
            `Currently, we only support bool, int, and str literals as arguments. The '${typeFullName}' is a builtin type, but not a literal type.`
          );
        }
        finalValue = { valueType: ValueType.Literal, value: type.literalValue };
        break;

      case "builtins.float":
      case "builtins.bytearray":
      case "builtins.bytes":
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
  private evaluateValueForTuple(valueNode: TupleNode): Value {
    const values: Value[] = [];
    if (valueNode.nodeType === ParseNodeType.Tuple) {
      // The expression node is a tuple construction expression.
      valueNode.expressions.forEach((expression) => {
        values.push(this.getValue(expression));
      });
    }
    return { valueType: ValueType.Tuple, value: values };
  }

  /**
   * For the dict type, if the expression node is a dict construction expression, we'll evaluate the
   * value of each key-value pair in the dict. If it's a dict variable, we'll throw an error.
   */
  private evaluateValueForDict(valueNode: DictionaryNode): Value {
    if (valueNode === undefined) {
      throw new Error(`Evaluation of the dict type without the expression node is not supported.`);
    }

    const values: [Value, Value][] = [];
    valueNode.entries.forEach((entry) => {
      if (entry.nodeType !== ParseNodeType.DictionaryKeyEntry) {
        throw new Error(
          `We only support the dictionary key-value pair in the dictionary construction expression.`
        );
      }

      const key = this.getValue(entry.keyExpression);
      const value = this.getValue(entry.valueExpression);
      values.push([key, value]);
    });

    return { valueType: ValueType.Dict, value: values };
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

    return { valueType: ValueType.DataClass, classType: type.details.fullName, value: values };
  }

  private evaluateValueForVariable(valueNode: NameNode): Value {
    // First, we need to get the declaration of the variable.
    const decls = this.typeEvaluator.getDeclarationsForNameNode(valueNode);
    if (decls === undefined || decls?.length > 1) {
      // If this variable is not declared, it's impossible to assess its value. If multiple
      // declarations exist, we can't decide which one to utilize.
      throw new Error("The variable must be declared exactly once.");
    }

    if (decls[0].node.parent?.nodeType !== ParseNodeType.Assignment) {
      // If the variable is not directly assigned a value, we can't evaluate its value yet.
      throw new Error(
        `Variable '${valueNode.value}' must be assigned a value directly. We only support the simplest assignment statement, the tuple assignment or other statements are not supported yet.`
      );
    }

    const rightExpression = decls[0].node.parent.rightExpression;
    return this.getValue(rightExpression);
  }

  private evaluateValueForCall(valueNode: CallNode): Value {
    // Extract the environment variable name and its default value from the expression node.
    const extractEnvVarInfo = (argExpression: CallNode) => {
      // The environment variable access is in the form of a function call, like
      // `os.environ.get("key")`.
      const argNodes = argExpression.arguments;
      if (argNodes.length !== 1 && argNodes.length !== 2) {
        throw new Error("The `os.environ.get` function should have one or two arguments.");
      }
      const envNameNode = argNodes[0];
      const defaultEnvVarValueNode = argNodes[1];

      // We try to get the text of the index using the value evaluator.
      const envNameValue = this.getValue(envNameNode.valueExpression);
      if (envNameValue.valueType !== ValueType.Literal || typeof envNameValue.value !== "string") {
        // Only when a value's type is undefined can we infer that it's a primitive type. Hence,
        // if a type is specified, it suggests that the value isn't a literal, and we can't
        // ascertain its react value.
        throw new Error("The environment variable name must be a string literal.");
      }
      const envVarName = envNameValue.value;

      let defaultEnvVarValue: string | undefined;
      if (defaultEnvVarValueNode) {
        const envVarValue = this.getValue(defaultEnvVarValueNode.valueExpression);
        if (envVarValue.valueType !== ValueType.Literal || typeof envVarValue.value !== "string") {
          throw new Error("The default environment variable value must be a string literal.");
        }
        defaultEnvVarValue = envVarValue.value;
      }

      return {
        envVarName: envVarName,
        defaultEnvVarValue: defaultEnvVarValue,
      };
    };

    if (TypeUtils.isEnvVarAccess(valueNode, this.typeEvaluator)) {
      // If this variable receives the value of an environment variable, we need to extract the name
      // of the environment variable, and its default value.
      return {
        valueType: ValueType.EnvVarAccess,
        ...extractEnvVarInfo(valueNode),
      };
    }

    const valueType = this.typeEvaluator.getType(valueNode);
    if (valueType && valueType.category === TypeCategory.Class) {
      // This might be a call to a data class constructor
      return this.evaluateValueByClassType(valueType, valueNode);
    }

    throw new Error(
      `Currently, we only support for accessing environment variables and constructing dataclass instances during function calls.`
    );
  }

  private evaluateValueForIndex(valueNode: IndexNode): Value {
    // Extract the environment variable name and its default value from the expression node.
    const extractEnvVarInfo = (argExpression: IndexNode) => {
      // The environment variable access is in the form of an index, like `os.environ["key"]`.
      const indexItems = argExpression.items;
      if (indexItems.length !== 1) {
        throw new Error("The index of the `os.environ` access should have only one item.");
      }
      const envNameNode = indexItems[0];

      // We try to get the text of the index using the value evaluator.
      const envNameValue = this.getValue(envNameNode.valueExpression);
      if (envNameValue.valueType !== ValueType.Literal || typeof envNameValue.value !== "string") {
        // Only when a value's type is undefined can we infer that it's a primitive type. Hence,
        // if a type is specified, it suggests that the value isn't a literal, and we can't
        // ascertain its react value.
        throw new Error("The environment variable name must be a string literal.");
      }
      const envVarName = envNameValue.value;

      return { envVarName: envVarName };
    };

    if (TypeUtils.isEnvVarAccess(valueNode, this.typeEvaluator)) {
      // If this variable receives the value of an environment variable, we need to extract the name
      // of the environment variable, and its default value.
      return {
        valueType: ValueType.EnvVarAccess,
        ...extractEnvVarInfo(valueNode),
      };
    }

    console.log(valueNode);

    throw new Error(
      `Currently, we only support for accessing environment variables using the index.`
    );
  }
}

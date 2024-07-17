import { LiteralValue as LiteralTypes } from "pyright-internal/dist/analyzer/types";

export enum ValueType {
  None = "none",
  Literal = "literal",
  DataClass = "dataclass",
  Tuple = "tuple",
  Dict = "dict",
  EnvVarAccess = "envVarAccess",
}

export interface ValueBase {
  readonly valueType: ValueType;
}

export interface NoneValue extends ValueBase {
  readonly valueType: ValueType.None;
}

export namespace NoneValue {
  export const instance: NoneValue = {
    valueType: ValueType.None,
  };

  export function create() {
    return instance;
  }
}

export interface LiteralValue extends ValueBase {
  readonly valueType: ValueType.Literal;
  readonly value: LiteralTypes;
}

export namespace LiteralValue {
  export function create(value: LiteralTypes): LiteralValue {
    return {
      valueType: ValueType.Literal,
      value,
    };
  }
}

export interface DataClassValue extends ValueBase {
  readonly valueType: ValueType.DataClass;
  readonly classType: string;
  readonly value: Record<string, Value>;
}

export namespace DataClassValue {
  export function create(classType: string, value: Record<string, Value>): DataClassValue {
    return {
      valueType: ValueType.DataClass,
      classType,
      value,
    };
  }
}

export interface TupleValue extends ValueBase {
  readonly valueType: ValueType.Tuple;
  readonly value: Value[];
}

export namespace TupleValue {
  export function create(value: Value[]): TupleValue {
    return {
      valueType: ValueType.Tuple,
      value,
    };
  }
}

export interface DictValue extends ValueBase {
  readonly valueType: ValueType.Dict;
  readonly value: [Value, Value][];
}

export namespace DictValue {
  export function create(value: [Value, Value][]): DictValue {
    return {
      valueType: ValueType.Dict,
      value,
    };
  }
}

export interface EnvVarAccessValue extends ValueBase {
  readonly valueType: ValueType.EnvVarAccess;
  readonly envVarName: string;
  readonly defaultEnvVarValue?: string;
}

export namespace EnvVarAccessValue {
  export function create(envVarName: string, defaultEnvVarValue?: string): EnvVarAccessValue {
    return {
      valueType: ValueType.EnvVarAccess,
      envVarName,
      defaultEnvVarValue,
    };
  }
}

export type Value =
  | NoneValue
  | LiteralValue
  | DataClassValue
  | TupleValue
  | DictValue
  | EnvVarAccessValue;

export namespace Value {
  // export function toJson(value: Value): string {}

  export function isLiteral(value: Value): value is LiteralValue {
    return value.valueType === ValueType.Literal;
  }

  export function isStringLiteral(value: LiteralValue) {
    return typeof value.value === "string";
  }

  export function isNumberLiteral(value: LiteralValue) {
    return typeof value.value === "number";
  }

  export function isBooleanLiteral(value: LiteralValue) {
    return typeof value.value === "boolean";
  }

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
     * Generate the text for accessing the environment variable. If not provided, it will try to get
     * the value directly from the environment variable.
     */
    genEnvVarAccessText?: (value: EnvVarAccessValue) => string;
  }

  export function toJson(value: Value, options: ToJsonOptions = {}): string {
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
        return `[${values.join(",")}]`;
      },
      [ValueType.Dict]: (value: DictValue) => {
        const kvs = value.value.map(
          ([k, v]) => `${Value.toJson(k, options)}:${Value.toJson(v, options)}`
        );
        return `{${kvs.join(",")}}`;
      },
      [ValueType.DataClass]: (value: DataClassValue) => {
        const values = value.value;
        const params = Object.entries(values)
          .map(([k, v]) => `"${k}":${Value.toJson(v, options)}`)
          .join(",");
        return `{${params}}`;
      },
      [ValueType.EnvVarAccess]: (value: EnvVarAccessValue) => {
        if (options.genEnvVarAccessText) {
          return options.genEnvVarAccessText(value);
        }

        const envVarName = value.envVarName;
        const envVarValue = process.env[envVarName] ?? value.defaultEnvVarValue;
        if (envVarValue) {
          return `"${envVarValue}"`;
        } else {
          return "null";
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

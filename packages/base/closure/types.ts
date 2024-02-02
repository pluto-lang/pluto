import { IResourceInfra } from "../resource";

export type AnyFunction = (...args: any[]) => any;

export interface Dependency {
  // The variable associated with the dependent resource object.
  readonly resourceObject: IResourceInfra;

  // There are two types of dependencies:
  //   1. Method Dependency:
  //       - resourceObject.method()
  //       - resourceObject.method(arg0, arg1, ...)
  //   2. Property Dependency:
  //       - resourceObject.property
  // For the first type, the methods utilized are defined in an interface that extends `IResourceClientApi`.
  // For the second type, several getter methods accessed are defined in an interface extending `IResourceCapturedProps`.
  readonly type: "method" | "property";

  // The name of the called method or the accessed property.
  readonly operation: string;
}

/**
 * An interface representing a compute closure.
 */
export interface ComputeClosure<T extends AnyFunction> {
  // The function signature, allowing ComputeClosure to be called as a function.
  (...args: Parameters<T>): ReturnType<T>;

  // The file path of the compute closure.
  readonly dirpath: string;

  readonly innerClosure?: ComputeClosure<AnyFunction>;

  // The client api and property dependencies of the compute closure.
  dependencies?: Dependency[];
}

export function isComputeClosure<T extends AnyFunction>(obj: any): obj is ComputeClosure<T> {
  if (obj === undefined) return false;
  const isFunction = typeof obj === "function";
  const hasDirpath = typeof obj.dirpath === "string";
  const hasValidDependencies = obj.dependencies === undefined || Array.isArray(obj.dependencies);
  return isFunction && hasDirpath && hasValidDependencies;
}

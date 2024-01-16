import { IResource } from "../resource";

export type AnyFunction = (...args: any[]) => any;

export interface Dependency {
  // The variable associated with the dependent resource object.
  readonly resourceObject: IResource;

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

  //
  readonly innerClosure?: ComputeClosure<AnyFunction>;

  // The client api and property dependencies of the compute closure.
  readonly dependencies?: Dependency[];
}

export function isComputeClosure<T extends AnyFunction>(obj: any): obj is ComputeClosure<T> {
  // 检查obj是否是函数
  const isFunction = typeof obj === "function";
  // 检查是否有filepath属性
  const hasFilepath = typeof obj.filepath === "string";
  // 根据ComputeClosure接口的定义，你还需要确保obj满足其余的属性要求。
  // 例如，你可能希望检查 innerClosure 和 dependencies 属性是否存在（如果它们是必要的）。

  // 如果需要检查 innerClosure：
  const hasValidInnerClosure = !obj.innerClosure || isComputeClosure(obj.innerClosure);

  // 如果需要检查 dependencies：
  const hasValidDependencies = Array.isArray(obj.dependencies); // 或者更详细的检查，取决于Dependency接口的结构

  // 返回obj是否是ComputeClosure
  return isFunction && hasFilepath && hasValidInnerClosure && hasValidDependencies;
}

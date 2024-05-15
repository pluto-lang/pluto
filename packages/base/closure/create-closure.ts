import { AnyFunction, ComputeClosure, isComputeClosure } from "./types";

type CreateClosureOptions = Partial<Omit<ComputeClosure<AnyFunction>, "innerClosure">>;

export function createClosure<T extends AnyFunction>(
  fn: T,
  options?: CreateClosureOptions
): ComputeClosure<T> {
  const newClosure: ComputeClosure<T> = Object.assign(fn, {
    ...options,
    dirpath: options?.dirpath ?? "inline",
    exportName: options?.exportName ?? "default",
  });

  if (isComputeClosure(newClosure)) {
    return newClosure;
  }
  throw new Error(`Failed to create closure. The result is not a valid closure.`);
}

export function wrapClosure<T extends AnyFunction, K extends AnyFunction>(
  wrapper: T,
  closure: ComputeClosure<K>,
  options?: CreateClosureOptions
): ComputeClosure<T> {
  const wrappedClosure: ComputeClosure<T> = Object.assign(wrapper, {
    dirpath: options?.dirpath ?? "inline",
    exportName: options?.exportName ?? "default",
    placeholder: options?.placeholder,
    dependencies: closure.dependencies?.concat(options?.dependencies ?? []),
    accessedEnvVars: closure.accessedEnvVars?.concat(options?.accessedEnvVars ?? []),
    innerClosure: closure,
  });

  if (isComputeClosure(wrappedClosure)) {
    return wrappedClosure;
  }
  throw new Error(`Failed to wrap closure. The result is not a valid closure.`);
}

export function getDepth(closure: ComputeClosure<AnyFunction>): number {
  let depth = 0;
  let current: ComputeClosure<AnyFunction> | undefined = closure;
  while (current) {
    depth++;
    current = current.innerClosure;
  }
  return depth;
}

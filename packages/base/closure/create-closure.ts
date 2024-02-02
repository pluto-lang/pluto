import { AnyFunction, ComputeClosure, isComputeClosure } from "./types";

type CreateClosureOptions = Partial<Pick<ComputeClosure<AnyFunction>, "dirpath" | "dependencies">>;

export function createClosure<T extends AnyFunction>(
  fn: T,
  options?: CreateClosureOptions
): ComputeClosure<T> {
  const newClosure: ComputeClosure<T> = Object.assign(fn, {
    dirpath: options?.dirpath ?? "inline",
    dependencies: options?.dependencies,
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
    dependencies: closure.dependencies?.concat(options?.dependencies ?? []),
    innerClosure: closure,
  });

  if (isComputeClosure(wrappedClosure)) {
    return wrappedClosure;
  }
  throw new Error(`Failed to wrap closure. The result is not a valid closure.`);
}

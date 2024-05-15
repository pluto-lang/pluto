export class Closure {
  public readonly extras: Record<string, any> = {};

  constructor(
    public readonly id: string,
    public readonly path: string,
    public readonly envVars: string[] = []
  ) {}
}

export function isClosure(obj: any): obj is Closure {
  const fakeClosure = new Closure("", "");
  const props = Object.getOwnPropertyNames(fakeClosure);
  for (const prop of props) {
    if (!(prop in obj) || typeof (fakeClosure as any)[prop] !== typeof obj[prop]) {
      // If the property is not in the object or the type is different, return false.
      return false;
    }
  }
  return true;
}

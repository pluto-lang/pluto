export class Closure {
  public readonly extras: Record<string, any> = {};

  constructor(
    public readonly id: string,
    public readonly path: string,
    public readonly envVars: string[] = []
  ) {}
}

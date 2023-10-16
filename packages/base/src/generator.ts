import * as arch from "./arch";

export interface GenerateOptions {
  readonly archRef: arch.Architecture;
  readonly outdir: string;
}

export interface Generator {
  generate(opts: GenerateOptions): Promise<void>;
}

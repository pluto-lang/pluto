import { Architecture } from "./arch/architecture";

export interface DeduceOptions {
  readonly filepaths: string[];
}

export interface Deducer {
  deduce(opts: DeduceOptions): Promise<Architecture>;
}

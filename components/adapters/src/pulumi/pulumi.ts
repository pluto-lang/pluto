import { Adapter, ApplyArgs, ApplyResult, DestroyArgs, DestroyResult } from "../adapter";
import { destroy } from "./destroy";
import { update } from "./update";

export class PulumiAdapter implements Adapter {
  public async apply(args: ApplyArgs): Promise<ApplyResult> {
    return await update(args);
  }

  public async destroy(args: DestroyArgs): Promise<DestroyResult> {
    return await destroy(args);
  }
}

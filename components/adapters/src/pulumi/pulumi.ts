import { Adapter, ApplyArgs, ApplyResult } from "../adapter";
import { update } from "./update";

export class PulumiAdapter implements Adapter {
  public async apply(args: ApplyArgs): Promise<ApplyResult> {
    return await update(args);
  }
}

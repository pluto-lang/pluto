import { Adapter, ApplyArgs } from "../adapter";
import { update } from "./update";

export class PulumiAdapter implements Adapter {
  public async apply(args: ApplyArgs): Promise<void> {
    await update(args);
  }
}

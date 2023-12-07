import { join } from "path";

export function genComputeUnitDir(basedir: string, unitName: string) {
  return join(basedir, unitName);
}

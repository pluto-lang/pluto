import { PlatformType } from "../platform";

export function isPlatformType(value: any): value is PlatformType {
  return Object.values(PlatformType).includes(value);
}

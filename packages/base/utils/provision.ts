import { ProvisionType } from "../provision";

export function isEngineType(value: any): value is ProvisionType {
  return Object.values(ProvisionType).includes(value);
}

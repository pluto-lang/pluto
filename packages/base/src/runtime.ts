export enum Type {
  AWS = "AWS",
  K8s = "K8S",
  Azure = "AZURE",
  GCP = "GCP",
  ALICLOUD = "ALCLOUD",
  Custom = "CUSTOM",
}

export function same(b: string, a: Type): boolean {
  return a == b.toUpperCase();
}

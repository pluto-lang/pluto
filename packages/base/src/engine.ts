export enum Type {
  pulumi = "pulumi",
  terraform = "terraform",
  simulator = "simulator",
}

export function isEngineType(value: any): value is Type {
  return Object.values(Type).includes(value);
}

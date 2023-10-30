export interface Resource {}

export interface FnResource extends Resource {}

export interface ResourceInfra extends Resource {
  get name(): string;
  // eslint-disable-next-line
  getPermission(op: string, resource?: ResourceInfra): any;
  postProcess(): void;
}

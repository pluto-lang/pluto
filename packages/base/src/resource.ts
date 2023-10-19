export interface Resource {}

export interface ResourceInfra extends Resource {
  get name(): string;
  postProcess(): void;
}

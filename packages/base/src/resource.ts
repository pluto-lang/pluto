export interface FnResource extends IResource {}

export interface ResourceInfra extends IResource {
  get name(): string;
  // eslint-disable-next-line
  getPermission(op: string, resource?: ResourceInfra): any;
  postProcess(): void;
}

/**
 * The class implementing this interface represents the type of cloud resource.
 * It's also the type that Pluto needs to detect and process.
 */
export interface IResource {}

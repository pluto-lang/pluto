export class ResourceNotFound extends Error {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`);
    this.name = "ResourceNotFound";
  }
}

export class MethodNotFound extends Error {
  constructor(method: string) {
    super(`Method not found: ${method}`);
    this.name = "MethodNotFound";
  }
}

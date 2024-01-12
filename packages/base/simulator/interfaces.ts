export interface IResourceInstance {
  addEventHandler(op: string, args: string, fnResourceId: string): void;
  setup(context: IContext): Promise<void>;
  cleanup(): Promise<void>;
}

export interface IContext {
  get serverUrl(): string;
  findInstance(resourceName: string): IResourceInstance;
}

export interface ServerRequest {
  resourceName: string;
  op: string;
  args: any[];
}

export interface ServerResponse {
  readonly result?: any;
  readonly error?: any;
}

export type SimulatorCleint = any;

export interface IResourceInstance {
  addEventHandler(op: string, args: any[]): void;
  cleanup(): Promise<void>;
}

export interface ServerRequest {
  resourceId: string;
  op: string;
  args: any[];
}

export interface ServerResponse {
  readonly result?: any;
  readonly error?: any;
}

export type SimulatorCleint = any;


export interface IStack {
    newResource(type: string, params: any[]): void;
    newClient(type: string, params: any[]): void;
}
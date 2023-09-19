import { Parameter } from './parameter';
import { Resource } from './resource';

export enum RelatType {
    CREATE = "create",
    ACCESS = "access"
}

export class Relationship {
    from: Resource;
    to: Resource;
    type: RelatType;
    operation: string;
    parameters: Parameter[];

    constructor(from: Resource, to: Resource, type: RelatType, op: string, params?: Parameter[]) {
        this.from = from;
        this.to = to;
        this.type = type;
        this.operation = op;
        this.parameters = params || [];
    }

    public getParamString(): string {
        this.parameters.sort((a, b) => a.index - b.index);
        return this.parameters.map((item) => item.value).join(', ');
    }
}
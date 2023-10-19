import { Parameter } from "./parameter";

export interface Location {
  file: string;
  linenum: { start: string; end: string };
}

export class Resource {
  readonly name: string;
  readonly type: string;
  locations: Location[] = [];
  readonly parameters: Parameter[];

  constructor(name: string, type: string, locations?: Location[], parameters?: Parameter[]) {
    this.name = name;
    this.type = type;
    this.locations = locations || [];
    this.parameters = parameters || [];
  }

  public getParamString(): string {
    this.parameters.sort((a, b) => a.index - b.index);
    return this.parameters.map((item) => item.value).join(", ");
  }
}

import { engine, project } from "@pluto/base";
import { PulumiAdapter } from "./pulumi";

export interface ApplyArgs {
  projName: string;
  stack: project.Stack;
  entrypoint: string;
}

export interface ApplyResult {
  outputs?: { [key: string]: any };
  error?: string;
}

type AdapterClass = { new (...args: any[]): Adapter };

export interface Adapter {
  apply(args: ApplyArgs): Promise<ApplyResult>;
}

export function BuildAdapterByEngine(engType: engine.Type): Adapter | undefined {
  const engMapping: { [key in engine.Type]?: AdapterClass } = {
    [engine.Type.pulumi]: PulumiAdapter,
  };
  if (!(engType in engMapping)) {
    return;
  }
  return new engMapping[engType]!();
}

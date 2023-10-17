import { engine, project } from "@pluto/base";
import { PulumiAdapter } from "./pulumi";

export interface ApplyArgs {
  projName: string;
  stack: project.Stack;
  entrypoint: string;
}

type AdapterClass = { new (...args: any[]): Adapter };

export interface Adapter {
  apply(args: ApplyArgs): Promise<void>;
}

export function BuildAdapterByEngine(engType: engine.Type): Adapter {
  const engMapping: { [key in engine.Type]?: AdapterClass } = {
    [engine.Type.pulumi]: PulumiAdapter,
  };
  return new engMapping[engType]!();
}

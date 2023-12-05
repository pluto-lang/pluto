import { arch, engine, project } from "@plutolang/base";
import { PulumiAdapter } from "./pulumi";
import { SimulatorAdapter } from "./simulator";

export interface ApplyArgs {
  projName: string;
  stack: project.Stack;
  entrypoint: string;
  readonly archRef?: arch.Architecture;
  readonly outdir?: string;
}

export interface ApplyResult {
  outputs?: { [key: string]: string };
  error?: string;
}

export interface DestroyArgs {
  projName: string;
  stack: project.Stack;
}

export interface DestroyResult {
  error?: string;
}

type AdapterClass = { new (): Adapter };

export interface Adapter {
  apply(args: ApplyArgs): Promise<ApplyResult>;
  destroy(args: DestroyArgs): Promise<DestroyResult>;
}

export function BuildAdapterByEngine(engType: engine.Type): Adapter | undefined {
  const engMapping: { [key in engine.Type]?: AdapterClass } = {
    [engine.Type.pulumi]: PulumiAdapter,
    [engine.Type.simulator]: SimulatorAdapter,
  };
  if (!(engType in engMapping)) {
    return;
  }
  return new engMapping[engType]!();
}

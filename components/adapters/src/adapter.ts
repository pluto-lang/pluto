import { core, engine } from "@plutolang/base";
import { PulumiAdapter } from "./pulumi";
import { SimulatorAdapter } from "./simulator";

export function BuildAdapterByEngine(
  engType: engine.Type,
  args: core.NewAdapterArgs
): core.Adapter | undefined {
  switch (engType) {
    case engine.Type.pulumi:
      return new PulumiAdapter(args);
    case engine.Type.simulator:
      return new SimulatorAdapter(args);
    default:
      throw new Error(`There is no adapter for '${engType}'`);
  }
}

import * as engine from "./engine";
import * as runtime from "./runtime";
import { Resource, ResourceInfra } from "./resource";

type InfraCls = { new (name: string, opts?: any): ResourceInfra };
type ResourceCls = { new (name: string, opts?: any): Resource };

export interface Registry {
  register(rtType: runtime.Type, engType: engine.Type, resType: ResourceCls, cls: InfraCls): void;

  getResourceDef(rtType: runtime.Type, engType: engine.Type, resType: ResourceCls): InfraCls;
}

export class Registry implements Registry {
  readonly store: { [key: string]: InfraCls } = {};

  public register(
    rtType: runtime.Type,
    engType: engine.Type,
    resType: ResourceCls,
    cls: InfraCls
  ): void {
    const key = this.getKey(rtType, engType, resType);
    this.store[key] = cls;
  }

  public getResourceDef(
    rtType: runtime.Type,
    engType: engine.Type,
    resType: ResourceCls
  ): InfraCls {
    const key = this.getKey(rtType, engType, resType);
    if (!(key in this.store)) {
      throw new Error(
        `cannot find the target infra resource class, RuntimeType: ${rtType}, EngineType: ${engType}, ResourceType: ${resType}`
      );
    }
    return this.store[key];
  }

  private getKey(rtType: runtime.Type, engType: engine.Type, resType: ResourceCls) {
    return `${rtType}/${engType}/${resType.name}`;
  }
}

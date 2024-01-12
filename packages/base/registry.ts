import { ProvisionType } from "./provision";
import { PlatformType } from "./platform";
import { IResource, ResourceInfra } from "./resource";
import { IResourceInstance } from "./simulator";

type InfraCls = { new (name: string, opts?: object): ResourceInfra | IResourceInstance };
type ResourceCls = { new (name: string, opts?: object): IResource } | "FnResource";

// eslint-disable-next-line
export interface Registry {
  register(
    platformType: PlatformType,
    provisionType: ProvisionType,
    resType: ResourceCls,
    cls: InfraCls
  ): void;

  getResourceDef(
    platformType: PlatformType,
    provisionType: ProvisionType,
    resType: ResourceCls
  ): InfraCls;
}

// eslint-disable-next-line
export class Registry implements Registry {
  readonly store: { [key: string]: InfraCls } = {};

  public register(
    platformType: PlatformType,
    provisionType: ProvisionType,
    resType: ResourceCls,
    cls: InfraCls
  ): void {
    const key = this.getKey(platformType, provisionType, resType);
    this.store[key] = cls;
  }

  public getResourceDef(
    platformType: PlatformType,
    provisionType: ProvisionType,
    resType: ResourceCls
  ): InfraCls {
    const key = this.getKey(platformType, provisionType, resType);
    if (!(key in this.store)) {
      throw new Error(
        `cannot find the target infra resource class, ype: ${platformType}, ype: ${provisionType}, ResourceType: ${resType}`
      );
    }
    return this.store[key];
  }

  private getKey(platformType: PlatformType, provisionType: ProvisionType, resType: ResourceCls) {
    const resName = typeof resType === "string" ? resType : resType.name;
    return `${platformType}/${provisionType}/${resName}`;
  }
}

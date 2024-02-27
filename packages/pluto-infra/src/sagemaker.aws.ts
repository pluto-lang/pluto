// TODO: move to separate package
import { ProvisionType, PlatformType, utils, IResourceInfra } from "@plutolang/base";
import { ISageMakerInfra, SageMakerOptions, SageMaker as SageMakerProto } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

type ISageMakerInfraImpl = ISageMakerInfra & IResourceInfra;

type SageMakerInfraImplClass = new (
  name: string,
  imageUri: string,
  options?: SageMakerOptions
) => ISageMakerInfraImpl;

const implClassMap = new ImplClassMap<ISageMakerInfraImpl, SageMakerInfraImplClass>(
  SageMakerProto.fqn,
  {
    [ProvisionType.Pulumi]: {
      [PlatformType.AWS]: async () => (await import("./aws")).SageMaker,
    },
  }
);

export abstract class SageMaker {
  public static async createInstance(
    name: string,
    imageUri: string,
    options?: SageMakerOptions
  ): Promise<ISageMakerInfraImpl> {
    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      name,
      imageUri,
      options
    );
  }
}

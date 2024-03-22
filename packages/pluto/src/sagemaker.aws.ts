// TODO: move to separate package
import {
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  PlatformType,
  utils,
} from "@plutolang/base";
import { aws } from "./clients";

export type HuggingFaceTaskType =
  | "audio-classification"
  | "automatic-speech-recognition"
  | "conversational"
  | "depth-estimation"
  | "document-question-answering"
  | "feature-extraction"
  | "fill-mask"
  | "image-classification"
  | "image-feature-extraction"
  | "image-segmentation"
  | "image-to-image"
  | "image-to-text"
  | "mask-generation"
  | "object-detection"
  | "question-answering"
  | "summarization"
  | "table-question-answering"
  | "text2text-generation"
  | "text-classification"
  | "sentiment-analysis"
  | "text-generation"
  | "text-to-audio"
  | "text-to-speech"
  | "token-classification"
  | "ner"
  | "translation"
  | "translation_xx_to_yy"
  | "video-classification"
  | "visual-question-answering"
  | "zero-shot-classification"
  | "zero-shot-image-classification"
  | "zero-shot-audio-classification"
  | "zero-shot-object-detection";

export interface SageMakerOptions {
  /**
   * The instance type to deploy the model, like `ml.m5.large`. ref:
   * https://docs.aws.amazon.com/sagemaker/latest/dg/large-model-inference-choosing-instance-types.html
   * @default ml.m5.large
   */
  instanceType?: string;
  /**
   * The environment variables to set in the container. These can be used to specify things like
   * HuggingFace model ID, task type, and your HuggingFace Hub token if necessary.
   */
  envs?: Record<string, any>;
}

/**
 * The methods of this interface can be used at runtime, but it doesn't belong to Client API or Captured Props.
 */
export interface ISageMakerRegularApi {
  /**
   * TODO: There are two bug within current deducer. One is that the deducer doesn't reduce the
   * repeated dependencies when the closure accesses same resource object multiple times. The other
   * is that if the closure only accesses the regular api (not client api, infra api or capatured
   * property), the deducer doesn't add the resource object to the dependencies. After the bugs are
   * fixed, the `endpointUrl` method should be moved from `ISageMakerCapturedProps` to this
   * interface.
   */
  // get endpointUrl(): string;
  get endpointName(): string;
}

export interface ISageMakerClientApi extends IResourceClientApi {
  invoke(inputData: any): Promise<any>;
}

export interface ISageMakerInfraApi extends IResourceInfraApi {}

export interface ISageMakerCapturedProps extends IResourceCapturedProps {
  endpointUrl(): string;
}

export type ISageMakerClient = ISageMakerClientApi & ISageMakerCapturedProps & ISageMakerRegularApi;

export type ISageMakerInfra = ISageMakerInfraApi & ISageMakerCapturedProps;

export class SageMaker implements IResource {
  /**
   *
   * @param name The model id on Hugging Face Model Hub.
   * @param imageUri A custom image URI to use for the SageMaker model.
   * https://huggingface.co/docs/transformers/main_classes/pipelines.
   * @param opts
   */
  constructor(name: string, imageUri: string, opts?: SageMakerOptions) {
    name;
    imageUri;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(
    name: string,
    imageUri: string,
    opts?: SageMakerOptions
  ): ISageMakerClient {
    const platformType = utils.currentPlatformType();
    if (platformType !== PlatformType.AWS) {
      throw new Error(`SageMaker is only supported on AWS`);
    }
    return new aws.SageMaker(name, imageUri, opts);
  }

  public static fqn = "@plutolang/pluto.aws.SageMaker";
}

export interface SageMaker extends IResource, ISageMakerClient, ISageMakerInfra {}

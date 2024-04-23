import {
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  PlatformType,
  utils,
} from "@plutolang/base";
import { aws } from "./clients";

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface BucketOptions {}

export interface IBucketRegularApi {
  readonly awsTableName?: string;
  readonly awsPartitionKey?: string;
}

/**
 * Define the access methods for Bucket that operate during runtime.
 */
export interface IBucketClientApi extends IResourceClientApi {
  /**
   * Upload a file to the bucket.
   * @param fileKey - The key of the file, which is used to identify the file in the bucket.
   * @param filePath - The path of the file to be uploaded.
   */
  put(fileKey: string, filePath: string): Promise<void>;
  /**
   * Download a file from the bucket.
   * @param fileKey - The key of the file, which is used to identify the file in the bucket.
   * @param filePath - The path of the file to store the downloaded file.
   */
  get(fileKey: string, filePath: string): Promise<void>;
}

/**
 * Define the methods for Bucket, which operate during compilation.
 */
export interface IBucketInfraApi extends IResourceInfraApi {}

export interface IBucketCapturedProps extends IResourceCapturedProps {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IBucketClient = IBucketClientApi & IBucketCapturedProps & IBucketRegularApi;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IBucketInfra = IBucketInfraApi & IBucketCapturedProps;

// TODO: abstract class
export class Bucket implements IResource {
  constructor(name: string, opts?: BucketOptions) {
    name;
    opts;
    throw new Error(
      "cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: BucketOptions): IBucketClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new aws.S3Bucket(name, opts);
      case PlatformType.K8s:
      case PlatformType.Simulator:
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }

  public static fqn = "@plutolang/pluto.Bucket";
}

export interface Bucket extends IResource, IBucketClient, IBucketInfra {}

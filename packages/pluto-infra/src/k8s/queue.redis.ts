import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { IResourceInfra, LanguageType } from "@plutolang/base";
import { currentLanguage, genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import { AnyFunction, IQueueInfra, Queue, QueueOptions } from "@plutolang/pluto";
import { genK8sResourceName } from "@plutolang/pluto/dist/clients/k8s";
import { KnativeService } from "./function.service";

export class RedisQueue extends pulumi.ComponentResource implements IResourceInfra, IQueueInfra {
  public readonly id: string;

  private readonly url: pulumi.Output<string>;

  constructor(name: string, args?: QueueOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:queue:k8s/Redis", name, args, opts);
    this.id = genResourceId(Queue.fqn, name);

    const redisLabel = { app: genK8sResourceName(this.id) };

    new k8s.apps.v1.Deployment(
      genK8sResourceName(this.id, "deploy"),
      {
        metadata: {
          labels: redisLabel,
          namespace: "default", // TODO: Make it configurable.
        },
        spec: {
          replicas: 1,
          selector: { matchLabels: redisLabel },
          template: {
            metadata: { labels: redisLabel },
            spec: {
              containers: [
                {
                  name: "redis",
                  image: "redis:latest",
                  ports: [{ containerPort: 6379 }],
                },
              ],
            },
          },
        },
      },
      { parent: this }
    );

    const redisService = new k8s.core.v1.Service(
      genK8sResourceName(this.id, "service"),
      {
        metadata: {
          name: genK8sResourceName(this.id, "service"),
          labels: redisLabel,
          namespace: "default", // TODO: Make it configurable.
        },
        spec: {
          ports: [{ port: 6379, targetPort: 6379 }],
          selector: redisLabel,
        },
      },
      { parent: this }
    );

    this.url = redisService.spec.apply((s) => `${s.clusterIP}:6379`);
  }

  public subscribe(closure: ComputeClosure<AnyFunction>): void {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    const adaptHandler = adaptPlatformNorm(closure);
    const func = new KnativeService(adaptHandler, /* name */ `${this.id}-func`);

    new k8s.apiextensions.CustomResource(
      genK8sResourceName(this.id, "sub"),
      {
        apiVersion: "sources.knative.dev/v1alpha1",
        kind: "RedisStreamSource",
        metadata: {
          name: genK8sResourceName({ maxLength: 20 }, this.id, "sub"),
          namespace: "default", // TODO: Make it configurable.
        },
        spec: {
          address: pulumi.interpolate`redis://${this.url}`,
          stream: this.id,
          group: this.id,
          sink: {
            ref: {
              apiVersion: func.kserviceMeta.apiVersion,
              kind: func.kserviceMeta.kind,
              name: func.kserviceMeta.name,
            },
          },
        },
      },
      { parent: this }
    );
  }

  public grantPermission() {}

  public postProcess(): void {}
}

function adaptPlatformNorm(closure: ComputeClosure<AnyFunction>): ComputeClosure<AnyFunction> {
  switch (currentLanguage()) {
    case LanguageType.TypeScript:
      return wrapClosure(() => {}, closure, {
        dirpath: require.resolve("./adapters/typescript/redis.queue"),
        exportName: "handler",
        placeholder: "__handler_",
      });
    case LanguageType.Python:
    default:
      throw new Error(`Unsupported language: ${currentLanguage()}`);
  }
}

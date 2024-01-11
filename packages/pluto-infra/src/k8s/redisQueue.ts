import { IQueueInfraApi, QueueInfraOptions } from "@plutolang/pluto";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ServiceLambda } from "./serviceLambda";
import { FnResource, ResourceInfra } from "@plutolang/base";

export class RedisQueue extends pulumi.ComponentResource implements ResourceInfra, IQueueInfraApi {
  readonly name: string;
  url: pulumi.Output<string>;

  constructor(name: string, args?: QueueInfraOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:k8s:RedisQueue", name, args, opts);
    this.name = name;

    const redisLabel = { app: `${name}-que-redis` };

    new k8s.apps.v1.Deployment(
      `${name}-redis-que-deployment`,
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
      `${name}-queue`,
      {
        metadata: {
          name: `${name}-queue`,
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

  public subscribe(fn: FnResource): void {
    if (!(fn instanceof ServiceLambda)) throw new Error("fn is not the instance of ServiceDef");
    const lambda = fn as ServiceLambda;

    new k8s.apiextensions.CustomResource(
      `${lambda.name}-${this.name}-subscription`,
      {
        apiVersion: "sources.knative.dev/v1alpha1",
        kind: "RedisStreamSource",
        metadata: {
          name: `${this.name}-${lambda.name}-source`,
          namespace: "default", // TODO: Make it configurable.
        },
        spec: {
          address: pulumi.interpolate`redis://${this.url}`,
          stream: this.name,
          group: this.name,
          sink: {
            ref: {
              apiVersion: lambda.kservice.apiVersion,
              kind: lambda.kservice.kind,
              name: lambda.kservice.metadata.name,
            },
          },
        },
      },
      { parent: this }
    );
  }

  public getPermission(op: string) {
    op;
  }

  public postProcess(): void {}
}

import { IKVStoreInfraApi, KVStoreInfraOptions } from "@plutolang/pluto";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ResourceInfra } from "@plutolang/base";

export class RedisKVStore
  extends pulumi.ComponentResource
  implements ResourceInfra, IKVStoreInfraApi
{
  readonly name: string;
  url: pulumi.Output<string>;

  constructor(name: string, args?: KVStoreInfraOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:k8s:RedisState", name, args, opts);
    this.name = name;

    const redisLabel = { app: "redis" };
    const redisPassword = `${name}-redis-password`;

    new k8s.apps.v1.Deployment(
      `${name}-redis-state-deploy`,
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
                  args: ["--requirepass", redisPassword],
                  ports: [{ name: "client", containerPort: 6379 }],
                },
              ],
            },
          },
        },
      },
      { parent: this }
    );

    const redisService = new k8s.core.v1.Service(
      `${name}-kvstore`,
      {
        metadata: {
          name: `${name}-kvstore`,
          labels: redisLabel,
          namespace: "default", // TODO: Make it configurable.
        },
        spec: {
          ports: [{ port: 6379, targetPort: "client" }],
          selector: redisLabel,
        },
      },
      { parent: this }
    );

    this.url = redisService.spec.apply((s) => `${s.clusterIP}:6379`);
  }

  public getPermission(op: string) {
    op;
  }

  public postProcess(): void {}
}

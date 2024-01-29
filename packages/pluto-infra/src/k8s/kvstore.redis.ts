import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { IKVStoreInfra, KVStore, KVStoreOptions } from "@plutolang/pluto";
import { genK8sResourceName } from "@plutolang/pluto/dist/clients/k8s";

export class RedisKVStore
  extends pulumi.ComponentResource
  implements IResourceInfra, IKVStoreInfra
{
  public readonly id: string;

  constructor(name: string, args?: KVStoreOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:kvstore:k8s/Redis", name, args, opts);
    this.id = genResourceId(KVStore.fqn, name);

    const redisLabel = { app: genK8sResourceName(this.id) };
    const redisPassword = `${this.id}-redis-password`;

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

    new k8s.core.v1.Service(
      genK8sResourceName(this.id, "service"),
      {
        metadata: {
          name: genK8sResourceName(this.id, "service"),
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
  }

  public grantPermission(_: string) {}

  public postProcess(): void {}
}

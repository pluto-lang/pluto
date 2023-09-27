import { Event, FaasResource, BaasResource, QueueDef, QueueOptions } from "@pluto/pluto";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ServiceDef } from "./ServiceDef";

export class RedisQueueDef extends BaasResource implements QueueDef {
    url: pulumi.Output<string>;

    constructor(name: string, args?: QueueOptions, opts?: pulumi.ComponentResourceOptions) {
        super("pluto:k8s:RedisQueue", name, args, opts);

        const redisLabel = { app: `${name}-que-redis` };

        const redisDeployment = new k8s.apps.v1.Deployment(`${name}-redis-que-deployment`, {
            metadata: {
                labels: redisLabel,
                namespace: 'default', // TODO: Make it configurable.
            },
            spec: {
                replicas: 1,
                selector: { matchLabels: redisLabel },
                template: {
                    metadata: { labels: redisLabel },
                    spec: {
                        containers: [{
                            name: 'redis',
                            image: 'redis:latest',
                            ports: [{ containerPort: 6379 }],
                        }],
                    },
                },
            },
        }, { parent: this });

        const redisService = new k8s.core.v1.Service(`${name}-redis-que-service`, {
            metadata: {
                labels: redisLabel,
                namespace: 'default', // TODO: Make it configurable.
            },
            spec: {
                ports: [{ port: 6379, targetPort: 6379 }],
                selector: redisLabel,
            },
        }, { parent: this });

        this.url = redisService.spec.apply(s => `${s.clusterIP}:6379`);

        // build the Dapr Component resource
        new k8s.apiextensions.CustomResource(`${name}-redis-queue`, {
            apiVersion: "dapr.io/v1alpha1",
            kind: "Component",
            metadata: {
                name: name,
            },
            spec: {
                type: "pubsub.redis",
                version: "v1",
                metadata: [
                    {
                        "name": "redisHost",
                        "value": this.url,
                    },
                    {
                        "name": "redisPassword",
                        "value": "",
                    }
                ]
            }
        }, { parent: this });
    }

    subscribe(fn: FaasResource | ((evt: Event) => Promise<string>)): void {
        if (!(fn instanceof ServiceDef)) throw new Error('fn is not the instance of ServiceDef');
        const lambda = fn as ServiceDef;

        new k8s.apiextensions.CustomResource(`${lambda.name}-${this.name}-subscription`, {
            apiVersion: "sources.knative.dev/v1alpha1",
            kind: "RedisStreamSource",
            metadata: {
                name: `${this.name}-${lambda.name}-source`,
                namespace: 'default', // TODO: Make it configurable.
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
                    }
                },
            }
        }, { parent: this });
    }

    public fuzzyArn(): string {
        return ""
    }
}
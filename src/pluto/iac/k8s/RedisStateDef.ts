import { StateDef, StateOptions, BaasResource } from "@pluto/pluto";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export class RedisStateDef extends BaasResource implements StateDef {
    url: pulumi.Output<string>;

    constructor(name: string, args?: StateOptions, opts?: pulumi.ComponentResourceOptions) {
        super("pluto:k8s:RedisState", name, args, opts);

        const redisLabel = { app: "redis" };
        const redisPassword = `${name}-redis-password`;

        const redisDeployment = new k8s.apps.v1.Deployment(`${name}-redis-state-deploy`, {
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
                            args: ['--requirepass', redisPassword],
                            ports: [{ name: 'client', containerPort: 6379 }],
                        }],
                    },
                },
            },
        }, { parent: this });

        const redisService = new k8s.core.v1.Service(`${name}-redis-state-svc`, {
            metadata: {
                labels: redisLabel,
                namespace: 'default', // TODO: Make it configurable.
            },
            spec: {
                ports: [{ port: 6379, targetPort: 'client' }],
                selector: redisLabel,
            },
        }, { parent: this });

        this.url = redisService.spec.apply(s => `${s.clusterIP}:6379`);

        // build the Dapr Component resource
        new k8s.apiextensions.CustomResource(`${name}-redis-state`, {
            apiVersion: "dapr.io/v1alpha1",
            kind: "Component",
            metadata: {
                name: name,
            },
            spec: {
                type: "state.redis",
                version: "v1",
                metadata: [
                    {
                        "name": "redisHost",
                        "value": this.url,
                    },
                    {
                        "name": "redisPassword",
                        "value": redisPassword,
                    }
                ]
            }
        }, { parent: this });
    }

    public fuzzyArn(): string {
        return ""
    }
}
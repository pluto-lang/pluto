import * as pulumi from "@pulumi/pulumi"
import { FaasResource } from "@pluto/pluto";
import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";

import * as fs from 'fs';

export class ServiceDef extends FaasResource {
    service: k8s.core.v1.Service;
    kservice: k8s.apiextensions.CustomResource;
    url: pulumi.Output<string>;

    constructor(name: string, args?: {}, opts?: pulumi.ComponentResourceOptions) {
        super("pluto:k8s:Service", name, args, opts);

        const dockerfileBody = `FROM node:16-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY dist/${name}.js ./
COPY dist/k8s-runtime.js ./
COPY dist/pluto /app/node_modules/@pluto/pluto

CMD [ "node", "k8s-runtime.js" ]
`
        const filename = `${name}.Dockerfile`;
        fs.writeFileSync(filename, dockerfileBody);

        const image = new docker.Image(`${name}-image`, {
            build: {
                dockerfile: filename,
                context: ".",
                platform: "linux/arm64",
            },
            imageName: `localhost:5001/pluto/${name}:latest`,
            registry: {
                server: "localhost:5001",
            },
        }, { parent: this });

        const appLabels = { app: name };
        const namespace = 'default';

        this.kservice = new k8s.apiextensions.CustomResource(`${name}-kservice`, {
            apiVersion: "serving.knative.dev/v1",
            kind: "Service",
            metadata: {
                name: name,
                namespace: namespace, // TODO: Make it configurable.
                labels: appLabels
            },
            spec: {
                template: {
                    metadata: {
                        labels: appLabels,
                        annotations: {
                            "dapr.io/enabled": "true",
                            "dapr.io/app-id": `pluto-dapr-app`,
                            "dapr.io/app-port": "8080",
                            "dapr.io/enable-api-logging": "true",
                            "dapr.io/metrics-port": "19090",
                        }
                    },
                    spec: {
                        containers: [
                            {
                                image: image.imageName,
                                env: [
                                    {
                                        name: "CIR_DIR",
                                        value: `/app/${name}.js`
                                    },
                                    {
                                        name: "RUNTIME_TYPE",
                                        value: "K8S"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }, { parent: this });

        this.service = new k8s.core.v1.Service(`${name}-svc`, {
            metadata: {
                name: `${name}-svc`,
                labels: appLabels,
                namespace: namespace,
            },
            spec: {
                selector: appLabels,
                ports: [{
                    port: 80,
                    protocol: "TCP",
                    targetPort: 8080
                }]
            }
        }, { parent: this })

        this.url = pulumi.interpolate`http://${name}.${namespace}.svc.cluster.local`
    }

    grantPermission(op: string, resourceArn: string) {

    }
}
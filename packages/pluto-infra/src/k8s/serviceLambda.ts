import fs from "fs";
import path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";
import { ResourceInfra } from "@pluto/base";

if (!process.env["WORK_DIR"]) {
  throw new Error("Missing environment variable WORK_DIR");
}
const WORK_DIR = process.env["WORK_DIR"]!;

export class ServiceLambda extends pulumi.ComponentResource implements ResourceInfra {
  readonly name: string;

  service: k8s.core.v1.Service;
  kservice: k8s.apiextensions.CustomResource;
  url: pulumi.Output<string>;

  constructor(name: string, args?: {}, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:k8s:Service", name, args, opts);
    this.name = name;

    // copy the compute module and runtime to a directory
    const moduleFilename = `${this.name}.js`;
    const runtimeFilename = "runtime.js";
    const modulePath = path.join(WORK_DIR, moduleFilename);
    const runtimePath = path.join(__dirname, runtimeFilename);
    const sourceDir = path.join(WORK_DIR, `${this.name}-payload`);
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.copyFileSync(modulePath, path.join(sourceDir, moduleFilename));
    fs.copyFileSync(runtimePath, path.join(sourceDir, runtimeFilename));

    const dockerfileBody = `FROM node:18-slim

WORKDIR /app

RUN npm install cloudevents express

COPY ${this.name}-payload/ ./

CMD [ "node", "runtime.js" ]
`;
    const filename = `${name}.Dockerfile`;
    const filepath = path.join(WORK_DIR, filename);
    fs.writeFileSync(filepath, dockerfileBody);

    const image = new docker.Image(
      `${name}-image`,
      {
        build: {
          dockerfile: filepath,
          context: WORK_DIR,
          platform: "linux/arm64",
        },
        imageName: `localhost:5001/pluto/${name}:latest`,
        registry: {
          server: "localhost:5001",
        },
      },
      { parent: this }
    );

    const appLabels = { app: name };
    const namespace = "default";

    this.kservice = new k8s.apiextensions.CustomResource(
      `${name}-kservice`,
      {
        apiVersion: "serving.knative.dev/v1",
        kind: "Service",
        metadata: {
          name: name,
          namespace: namespace, // TODO: Make it configurable.
          labels: appLabels,
        },
        spec: {
          template: {
            metadata: {
              labels: appLabels,
              annotations: {
                // "dapr.io/enabled": "true",
                // "dapr.io/app-id": `pluto-dapr-app`,
                // "dapr.io/app-port": "8080",
                // "dapr.io/enable-api-logging": "true",
                // "dapr.io/metrics-port": "19090",
              },
            },
            spec: {
              containers: [
                {
                  image: image.imageName,
                  env: [
                    {
                      name: "COMPUTE_MODULE",
                      value: `/app/${name}.js`,
                    },
                    {
                      name: "RUNTIME_TYPE",
                      value: "K8S",
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      { parent: this }
    );

    this.service = new k8s.core.v1.Service(
      `${name}-svc`,
      {
        metadata: {
          name: `${name}-svc`,
          labels: appLabels,
          namespace: namespace,
        },
        spec: {
          selector: appLabels,
          ports: [
            {
              port: 80,
              protocol: "TCP",
              targetPort: 8080,
            },
          ],
        },
      },
      { parent: this }
    );

    this.url = pulumi.interpolate`http://${name}.${namespace}.svc.cluster.local`;
  }

  public getPermission(op: string) {
    op;
  }

  public postProcess(): void {}
}

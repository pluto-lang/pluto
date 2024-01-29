import os from "os";
import fs from "fs-extra";
import path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";
import { IResourceInfra, PlatformType } from "@plutolang/base";
import { currentProjectName, currentStackName, genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure } from "@plutolang/base/closure";
import {
  FunctionOptions,
  IFunctionInfra,
  Function,
  AnyFunction,
  DEFAULT_FUNCTION_NAME,
} from "@plutolang/pluto";
import { genK8sResourceName } from "@plutolang/pluto/dist/clients/k8s";
import { Metadata } from "./types";
import { serializeClosureToDir } from "../utils";

export class KnativeService
  extends pulumi.ComponentResource
  implements IResourceInfra, IFunctionInfra
{
  public readonly id: string;

  public readonly serviceMeta: Metadata;
  public readonly kserviceMeta: Metadata;
  public readonly url: pulumi.Output<string>;

  private readonly appLabels: { app: string };
  private readonly namespace: string = "default";

  constructor(closure: ComputeClosure<AnyFunction>, options?: FunctionOptions) {
    const name = options?.name || DEFAULT_FUNCTION_NAME;
    super("pluto:function:k8s/KnativeService", name, options);
    this.id = genResourceId(Function.fqn, name);
    this.appLabels = { app: genK8sResourceName(this.id) };

    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    // extract the environment variables from the closure.
    const envs: { name: string; value: string }[] = [
      { name: "PLUTO_PROJECT_NAME", value: currentProjectName() },
      { name: "PLUTO_STACK_NAME", value: currentStackName() },
      { name: "PLUTO_PLATFORM_TYPE", value: PlatformType.K8s },
    ];
    if (options?.envs) {
      for (const key of Object.keys(options?.envs)) {
        envs.push({ name: key, value: options.envs[key] });
      }
    }

    // Serialize the closure with its dependencies to a directory.
    const workdir = path.join(os.tmpdir(), `pluto`, `${this.id}_${Date.now()}`);
    fs.ensureDirSync(workdir);
    const entrypointFilePathP = serializeClosureToDir(workdir, closure, { exec: true });

    // Build the image.
    const image = this.buildImage(workdir, entrypointFilePathP);

    // Create the knative service.
    const kservice = this.createKnativeService(image, envs);
    this.kserviceMeta = {
      apiVersion: kservice.apiVersion,
      kind: kservice.kind,
      name: kservice.metadata.name,
    };

    // Create the service.
    const service = this.createService();
    this.serviceMeta = {
      apiVersion: service.apiVersion,
      kind: service.kind,
      name: service.metadata.name,
    };

    this.url = pulumi.interpolate`http://${this.id}.${this.namespace}.svc.cluster.local`;
  }

  public grantPermission(_: string) {}

  public postProcess(): void {}

  private buildImage(workdir: string, entrypointFilePath: Promise<string>) {
    const dockerfileName = `${this.id}.Dockerfile`;
    const dockerfilePath = path.join(workdir, dockerfileName);

    const createDockerfileP = entrypointFilePath.then((entrypointFilePath) => {
      const dockerfileBody = `FROM node:18-slim
WORKDIR /app
COPY . ./
CMD [ "node", "${path.basename(entrypointFilePath)}" ]`;
      fs.writeFileSync(dockerfilePath, dockerfileBody);
    });

    // build the image
    const imageName = `localhost:5001/pluto/${genK8sResourceName(
      { maxLength: 20 },
      this.id
    )}:latest`;
    const image = new docker.Image(
      genK8sResourceName(this.id, "image"),
      {
        build: {
          dockerfile: createDockerfileP.then(() => dockerfilePath),
          context: workdir,
          platform: "linux/arm64", // TODO: adapt the platform.
        },
        imageName: imageName,
        registry: {
          server: "localhost:5001",
        },
      },
      { parent: this }
    );
    return image;
  }

  private createKnativeService(image: docker.Image, envs: { name: string; value: string }[]) {
    const kservice = new k8s.apiextensions.CustomResource(
      genK8sResourceName(this.id, "kservice"),
      {
        apiVersion: "serving.knative.dev/v1",
        kind: "Service",
        metadata: {
          name: genK8sResourceName(this.id, "kservice"),
          namespace: this.namespace, // TODO: Make it configurable.
          labels: this.appLabels,
        },
        spec: {
          template: {
            metadata: {
              labels: this.appLabels,
              annotations: {},
            },
            spec: {
              containers: [
                {
                  image: image.imageName,
                  env: envs,
                },
              ],
            },
          },
        },
      },
      { parent: this }
    );
    return kservice;
  }

  private createService() {
    const service = new k8s.core.v1.Service(
      genK8sResourceName(this.id, "service"),
      {
        metadata: {
          name: genK8sResourceName(this.id, "service"),
          labels: this.appLabels,
          namespace: this.namespace,
        },
        spec: {
          selector: this.appLabels,
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
    return service;
  }
}

import os from "os";
import fs from "fs-extra";
import path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";
import { IResourceInfra, PlatformType } from "@plutolang/base";
import {
  createEnvNameForProperty,
  currentProjectName,
  currentStackName,
  genResourceId,
} from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import {
  FunctionOptions,
  IFunctionInfra,
  Function,
  AnyFunction,
  DEFAULT_FUNCTION_NAME,
  DirectCallResponse,
} from "@plutolang/pluto";
import { genK8sResourceName } from "@plutolang/pluto/dist/clients/k8s";
import { Metadata } from "./types";
import { serializeClosureToDir } from "../utils";
import { responseAndClose, runtimeBase } from "./utils";

export class KnativeService
  extends pulumi.ComponentResource
  implements IResourceInfra, IFunctionInfra
{
  public readonly id: string;

  private readonly appLabels: { app: string };
  private readonly namespace: string = "default";

  public readonly serviceMeta: Metadata;
  public readonly kserviceMeta: Metadata;

  constructor(closure: ComputeClosure<AnyFunction>, options?: FunctionOptions) {
    const name = options?.name || DEFAULT_FUNCTION_NAME;
    super("pluto:function:k8s/KnativeService", name, options);
    this.id = genResourceId(Function.fqn, name);
    this.appLabels = { app: genK8sResourceName(this.id) };

    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    // Check if the closure is created by user directly or not. If yes, we need to wrap it with the
    // platform adaption function.
    //
    // TODO: The closure that meets the below condition might not necessarily be one created by the
    // user themselves. It could also potentially be created by a SDK developer. We need to find a
    // more better method to verify this.
    if (closure.dirpath !== "inline" && closure.innerClosure === undefined) {
      closure = wrapClosure(adaptK8sRuntime(closure), closure);
    }

    // Serialize the closure with its dependencies to a directory.
    const workdir = path.join(os.tmpdir(), `pluto`, `${this.id}_${Date.now()}`);
    fs.ensureDirSync(workdir);
    const entrypointFilePathP = serializeClosureToDir(workdir, closure, { exec: true });

    // Build the image.
    const image = this.buildImage(workdir, entrypointFilePathP);

    // Create the service.
    const service = this.createService();
    this.serviceMeta = {
      apiVersion: service.apiVersion,
      kind: service.kind,
      name: service.metadata.name,
    };
    const serviceInternalIP = service.spec.clusterIP;

    // extract the environment variables from the closure.
    const envs: { name: string; value: string | pulumi.Output<string> }[] = [
      { name: "PLUTO_PROJECT_NAME", value: currentProjectName() },
      { name: "PLUTO_STACK_NAME", value: currentStackName() },
      { name: "PLUTO_PLATFORM_TYPE", value: PlatformType.K8s },
      { name: createEnvNameForProperty(this.id, "clusterIP"), value: serviceInternalIP },
    ];
    if (options?.envs) {
      for (const key of Object.keys(options?.envs)) {
        envs.push({ name: key, value: options.envs[key] });
      }
    }

    // Create the knative service.
    const kservice = this.createKnativeService(image, envs);
    this.kserviceMeta = {
      apiVersion: kservice.apiVersion,
      kind: kservice.kind,
      name: kservice.metadata.name,
    };
  }

  public grantPermission() {}

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
    )}:${Date.now()}`;
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

  private createKnativeService(
    image: docker.Image,
    envs: { name: string; value: string | pulumi.Output<string> }[]
  ) {
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
          annotations: {
            "pulumi.com/skipAwait": "true",
          },
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

function adaptK8sRuntime(__handler_: AnyFunction) {
  return async () => {
    runtimeBase(async (_, res, parsedBody) => {
      try {
        const payload = JSON.parse(parsedBody.body ?? "[]");
        console.log("Payload:", payload);
        if (!Array.isArray(payload)) {
          responseAndClose(res, 500, `Payload should be an array.`);
          return;
        }

        let response: DirectCallResponse;
        try {
          const respBody = await __handler_(...payload);
          response = {
            code: 200,
            body: respBody,
          };
        } catch (e) {
          // The error comes from inside the user function.
          console.log("Function execution failed:", e);
          response = {
            code: 400,
            body: `Function execution failed: ` + (e instanceof Error ? e.message : e),
          };
        }
        responseAndClose(res, 200, JSON.stringify(response), {
          contentType: "application/json",
        });
      } catch (e) {
        // The error is caused by the HTTP processing, not the user function.
        console.log("Http processing failed:", e);
        responseAndClose(res, 500, "Internal Server Error");
      }
    });
  };
}

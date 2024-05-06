import fs from "fs-extra";
import path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";
import { IResourceInfra, LanguageType, PlatformType } from "@plutolang/base";
import {
  createEnvNameForProperty,
  currentLanguage,
  currentProjectName,
  currentStackName,
  genResourceId,
} from "@plutolang/base/utils";
import { ComputeClosure, getDepth, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import {
  FunctionOptions,
  IFunctionInfra,
  Function,
  AnyFunction,
  DEFAULT_FUNCTION_NAME,
} from "@plutolang/pluto";
import { genK8sResourceName } from "@plutolang/pluto/dist/clients/k8s";
import { Metadata } from "./types";
import { dumpClosureToDir } from "../utils";
import assert from "assert";

export class KnativeService
  extends pulumi.ComponentResource
  implements IResourceInfra, IFunctionInfra
{
  public readonly id: string;
  private readonly options: FunctionOptions;

  private readonly appLabels: { app: string };
  private readonly namespace: string = "default";

  public readonly serviceMeta: Metadata;
  public readonly kserviceMeta: Metadata;

  constructor(closure: ComputeClosure<AnyFunction>, name?: string, options: FunctionOptions = {}) {
    name = name || DEFAULT_FUNCTION_NAME;
    super("pluto:function:k8s/KnativeService", name, options);
    this.id = genResourceId(Function.fqn, name);
    this.options = options;
    this.appLabels = { app: genK8sResourceName(this.id) };

    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    if (getDepth(closure) === 1) {
      // If the depth of the closure is 1, it means there is only the business closure in the
      // hierarchy of the closure. We need to wrap it with the platform adaption function.
      closure = adaptPlatformNorm(closure);
    }
    // We've established a standard for the Kubernetes runtime handler, which can be found in the
    // `type.ts` file. Before wrapping the base runtime, it should be treated as a runtime handler.
    // Currently, we're wrapping the base runtime for this closure, which will serve as the starting
    // point for the container.
    closure = wrapBaseRuntime(closure);

    // Serialize the closure with its dependencies to a directory.
    assert(process.env.WORK_DIR, "WORK_DIR is not set.");
    const workdir = path.join(process.env.WORK_DIR, `assets`, this.id);
    fs.removeSync(workdir);
    fs.ensureDirSync(workdir);
    const entrypointFilePath = dumpClosureToDir(
      workdir,
      closure,
      currentLanguage(),
      /* exec */ true
    );

    // Build the image.
    const image = this.buildImage(workdir, entrypointFilePath);

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

  public url(): string {
    throw new Error("The Knative service URL is currently not supported.");
  }

  public grantPermission() {}

  public postProcess(): void {}

  private buildImage(workdir: string, entrypointFilePath: string) {
    const dockerfileName = `${this.id}.Dockerfile`;
    const dockerfilePath = path.join(workdir, dockerfileName);

    const dockerfileBody = `FROM node:20-slim
WORKDIR /app
COPY . ./
CMD [ "node", "${path.basename(entrypointFilePath)}" ]`;
    fs.writeFileSync(dockerfilePath, dockerfileBody);

    // build the image
    const k8sConfig = new pulumi.Config("kubernetes");
    const registryUrl = k8sConfig.get("registry") ?? "docker.io";
    const imageTag = `${genK8sResourceName({ maxLength: 20 }, this.id)}-${Date.now()}`;
    const imageName = `${registryUrl}/${formatRepoName(currentProjectName())}:${imageTag}`;

    let platform = k8sConfig.get("platform") ?? "linux/amd64";
    if (platform === "auto") {
      platform = `linux/${getCpuArch()}`;
    }

    const image = new docker.Image(
      genK8sResourceName(this.id, "image"),
      {
        build: {
          dockerfile: dockerfilePath,
          context: workdir,
          platform: platform,
        },
        imageName: imageName,
        registry: {
          server: registryUrl,
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
    const memory = this.options.memory ?? 128;

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
                  resources: {
                    limits: {
                      memory: `${memory}Mi`,
                    },
                  },
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

function getCpuArch(): string {
  switch (process.arch) {
    case "arm64":
      return "arm64";
    case "x64":
      return "amd64";
    default:
      throw new Error(`Unsupported architecture: ${process.arch}`);
  }
}

function formatRepoName(repoName: string): string {
  return repoName
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function adaptPlatformNorm(closure: ComputeClosure<AnyFunction>): ComputeClosure<AnyFunction> {
  switch (currentLanguage()) {
    case LanguageType.TypeScript:
      return wrapClosure(() => {}, closure, {
        dirpath: require.resolve("./adapters/typescript/knative"),
        exportName: "handler",
        placeholder: "__handler_",
      });
    case LanguageType.Python:
    default:
      throw new Error(`Unsupported language: ${currentLanguage()}`);
  }
}

function wrapBaseRuntime(closure: ComputeClosure<AnyFunction>): ComputeClosure<AnyFunction> {
  switch (currentLanguage()) {
    case LanguageType.TypeScript:
      return wrapClosure(() => {}, closure, {
        dirpath: require.resolve("./adapters/typescript/http-server"),
        exportName: "handler",
        placeholder: "__handler_",
      });
    case LanguageType.Python:
    default:
      throw new Error(`Unsupported language: ${currentLanguage()}`);
  }
}

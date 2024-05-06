import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { IResourceInfra, LanguageType } from "@plutolang/base";
import { currentLanguage, genResourceId } from "@plutolang/base/utils";
import {
  AnyFunction,
  ComputeClosure,
  isComputeClosure,
  wrapClosure,
} from "@plutolang/base/closure";
import { IRouterInfra, RequestHandler, Router, RouterOptions, parseUrl } from "@plutolang/pluto";
import { genK8sResourceName } from "@plutolang/pluto/dist/clients/k8s";
import { KnativeService } from "./function.service";

export class IngressRouter
  extends pulumi.ComponentResource
  implements IResourceInfra, IRouterInfra
{
  public readonly id: string;

  private readonly _url: pulumi.Output<string>;
  private readonly routes: { path: string; handler: KnativeService }[];

  public outputs?: pulumi.Output<any>;

  constructor(name: string, args?: RouterOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:router:k8s/Ingress", name, args, opts);
    this.id = genResourceId(Router.fqn, name);
    this.routes = [];

    this._url = pulumi.interpolate`${genK8sResourceName(this.id)}.localdev.me`;
    this.outputs = this._url;
  }

  public url(): string {
    return this._url as any;
  }

  public get(path: string, closure: ComputeClosure<RequestHandler>): void {
    this.routes.push({ path, handler: this.createService("GET", path, closure) });
  }

  public post(path: string, closure: ComputeClosure<RequestHandler>): void {
    this.routes.push({ path, handler: this.createService("POST", path, closure) });
  }

  public put(path: string, closure: ComputeClosure<RequestHandler>): void {
    this.routes.push({ path, handler: this.createService("PUT", path, closure) });
  }

  public delete(path: string, closure: ComputeClosure<RequestHandler>): void {
    this.routes.push({ path, handler: this.createService("DELETE", path, closure) });
  }

  public all(path: string, closure: ComputeClosure<RequestHandler>, raw?: boolean): void {
    this.routes.push({ path, handler: this.createService("ALL", path, closure, raw) });
  }

  private createService(
    method: string,
    path: string,
    closure: ComputeClosure<RequestHandler>,
    raw?: boolean
  ) {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    // const adaptHandler = wrapClosure(adaptK8sRuntime(closure, raw), closure);
    const adaptHandler = adaptPlatformNorm(closure, raw);
    const func = new KnativeService(
      adaptHandler,
      /* name */ `${this.id}-${method}-${path.replaceAll(/[^_0-9a-zA-Z]/g, "")}-func`
    );
    return func;
  }

  public grantPermission() {}

  public postProcess(): void {
    const appLabels = { app: genK8sResourceName(this.id) };

    const paths: pulumi.Input<k8s.types.input.networking.v1.HTTPIngressPath>[] = [];
    this.routes.forEach((item) => {
      paths.push({
        path: convertToExpressPath(item.path),
        pathType: "ImplementationSpecific",
        backend: {
          service: {
            name: item.handler.serviceMeta.name,
            port: { number: 80 },
          },
        },
      });
    });

    new k8s.networking.v1.Ingress(
      genK8sResourceName(this.id, "ingress"),
      {
        metadata: {
          labels: appLabels,
          annotations: {
            "pulumi.com/skipAwait": "true",
          },
        },
        spec: {
          ingressClassName: "nginx",
          rules: [
            {
              host: this.url(),
              http: {
                paths: paths,
              },
            },
          ],
        },
      },
      { parent: this }
    );
  }
}

function convertToExpressPath(url: string): string {
  const parts = parseUrl(url);
  return (
    "/" +
    parts
      .map((part) => {
        if (part.isParam) {
          return `:${part.content}`;
        }
        if (part.isWildcard) {
          return "*";
        }
        return part.content;
      })
      .join("/")
  );
}

function adaptPlatformNorm(
  closure: ComputeClosure<RequestHandler>,
  raw: boolean = false
): ComputeClosure<AnyFunction> {
  switch (currentLanguage()) {
    case LanguageType.TypeScript:
      return wrapClosure(() => {}, closure, {
        dirpath: require.resolve("./adapters/typescript/ingress" + (raw ? ".raw" : "")),
        exportName: "handler",
        placeholder: "__handler_",
      });
    case LanguageType.Python:
    default:
      throw new Error(`Unsupported language: ${currentLanguage()}`);
  }
}

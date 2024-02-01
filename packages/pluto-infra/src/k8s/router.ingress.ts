import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import { IRouterInfra, RequestHandler, Router, RouterOptions, HttpRequest } from "@plutolang/pluto";
import { genK8sResourceName } from "@plutolang/pluto/dist/clients/k8s";
import { KnativeService } from "./function.service";
import { responseAndClose, runtimeBase } from "./utils";

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

  private createService(method: string, path: string, closure: ComputeClosure<RequestHandler>) {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    const adaptHandler = wrapClosure(adaptK8sRuntime(closure), closure);
    const func = new KnativeService(adaptHandler, {
      name: `${this.id}-${method}-${path.replaceAll(/[^_0-9a-zA-Z]/g, "")}-func`,
    });
    return func;
  }

  public grantPermission(_: string) {}

  public postProcess(): void {
    const appLabels = { app: genK8sResourceName(this.id) };

    const paths: pulumi.Input<k8s.types.input.networking.v1.HTTPIngressPath>[] = [];
    this.routes.forEach((item) => {
      paths.push({
        path: item.path,
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

function adaptK8sRuntime(__handler_: RequestHandler) {
  return async () => {
    runtimeBase(async (req, res, parsed) => {
      const plutoRequest: HttpRequest = {
        path: parsed.url.pathname || "/",
        method: req.method || "UNKNOWN",
        headers: {},
        query: parsed.url.query || {},
        body: parsed.body ?? null,
      };
      console.log("Request:", plutoRequest);

      try {
        const respBody = await __handler_(plutoRequest);
        responseAndClose(res, respBody.statusCode, JSON.stringify(respBody.body), {
          contentType: "application/json",
        });
      } catch (e) {
        console.log("Http processing failed:", e);
        responseAndClose(res, 500, "Internal Server Error");
      }
    });
  };
}

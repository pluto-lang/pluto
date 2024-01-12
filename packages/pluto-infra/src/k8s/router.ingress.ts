import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { IRouterInfra, RouterOptions } from "@plutolang/pluto";
import { FnResource, ResourceInfra } from "@plutolang/base";
import { ServiceLambda } from "./function.service";

export class IngressRouter extends pulumi.ComponentResource implements ResourceInfra, IRouterInfra {
  readonly name: string;

  private _url: pulumi.Output<string>;
  private routes: { path: string; handler: ServiceLambda }[];

  constructor(name: string, args?: RouterOptions, opts?: pulumi.ComponentResourceOptions) {
    super("pluto:k8s:Ingress", name, args, opts);
    this.name = name;
    this.routes = [];
    this._url = pulumi.interpolate`${this.name}.localdev.me`;
  }

  public get url(): string {
    return this._url as any;
  }

  public get(path: string, fn: FnResource): void {
    const handler = fn as ServiceLambda;
    this.routes.push({ path, handler });
  }

  public post(path: string, fn: FnResource): void {
    const handler = fn as ServiceLambda;
    this.routes.push({ path, handler });
  }

  public put(path: string, fn: FnResource): void {
    const handler = fn as ServiceLambda;
    this.routes.push({ path, handler });
  }

  public delete(path: string, fn: FnResource): void {
    const handler = fn as ServiceLambda;
    this.routes.push({ path, handler });
  }

  public getPermission(op: string) {
    op;
  }

  public postProcess(): void {
    const appLabels = { app: this.name };

    const paths: pulumi.Input<k8s.types.input.networking.v1.HTTPIngressPath>[] = [];
    this.routes.forEach((item) => {
      paths.push({
        path: item.path,
        pathType: "ImplementationSpecific",
        backend: {
          service: {
            name: item.handler.service.metadata.name,
            port: { number: 80 },
          },
        },
      });
    });

    new k8s.networking.v1.Ingress(
      `${this.name}-ingress`,
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
              host: this.url,
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

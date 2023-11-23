import * as pulumi from "@pulumi/pulumi";
import { Resource, ResourceInfra } from "@plutolang/base";
import { RequestHandler, RouterInfra, RouterInfraOptions } from "@plutolang/pluto";
import * as alicloud from "@pulumi/alicloud";
import { FCFnResource } from "./fcFnResource";

const REGION = process.env.ALICLOUD_REGION;

export class AppRouter extends pulumi.ComponentResource implements RouterInfra, ResourceInfra {
  readonly name: string;

  private readonly group: alicloud.apigateway.Group;
  private readonly app: alicloud.apigateway.App;

  constructor(name: string, args?: RouterInfraOptions, opts?: pulumi.ComponentResourceOptions) {
    if (REGION == undefined) {
      throw new Error(`Please set the environment variable ALICLOUD_REGION`);
    }

    super("pluto:router:alicloud/Api", name, args, opts);
    this.name = name;

    this.group = new alicloud.apigateway.Group(
      `${name}-group`,
      {
        description: `${name}-group`,
      },
      { parent: this }
    );
    this.app = new alicloud.apigateway.App(
      `${name}-app`,
      {
        description: `${name}-app`,
        name: `${name}-app`,
      },
      { parent: this }
    );
  }

  public get(path: string, fn: Resource): void {
    if (!(fn instanceof FCFnResource)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as FCFnResource;

    this.addHandler("GET", path, lambda);
  }

  public post(path: string, fn: RequestHandler): void {
    if (!(fn instanceof FCFnResource)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as FCFnResource;

    this.addHandler("POST", path, lambda);
  }

  public put(path: string, fn: RequestHandler): void {
    if (!(fn instanceof FCFnResource)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as FCFnResource;

    this.addHandler("PUT", path, lambda);
  }

  public delete(path: string, fn: RequestHandler): void {
    if (!(fn instanceof FCFnResource)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as FCFnResource;

    this.addHandler("DELETE", path, lambda);
  }

  private addHandler(method: string, path: string, fnResource: FCFnResource) {
    const resourceNamePrefix = `${fnResource.name}-${path.replace("/", "_")}-${method}`;
    const api = new alicloud.apigateway.Api(
      `${resourceNamePrefix}-api`,
      {
        authType: "ANONYMOUS",
        description: `${resourceNamePrefix}-api`,
        groupId: this.group.id,
        requestConfig: {
          method: method,
          mode: "PASSTHROUGH",
          path: path,
          protocol: "HTTP",
        },
        serviceType: "FunctionCompute",
        fcServiceConfig: {
          functionName: fnResource.fcInstance.name,
          region: "", // TODO
          serviceName: fnResource.fcService.name,
          timeout: 30,
        },
      },
      { parent: this }
    );
    new alicloud.apigateway.AppAttachment(
      `${resourceNamePrefix}-app-attachment`,
      {
        apiId: api.apiId,
        groupId: this.group.id,
        appId: this.app.id,
        stageName: "dev", // TODO: modifiable
      },
      { parent: this }
    );
  }

  public getPermission(op: string, resource?: ResourceInfra | undefined) {
    op;
    resource;
    throw new Error("Method not implemented.");
  }

  public postProcess(): void {}
}

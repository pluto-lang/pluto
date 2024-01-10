import { assert } from "console";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { IResource, ResourceInfra } from "@plutolang/base";
import { IRouterCapturedProps, IRouterInfraApi, RouterInfraOptions } from "@plutolang/pluto";
import { Api, Route } from "@pulumi/aws/apigatewayv2";
import { Lambda } from "./lambda";
import { currentAwsRegion } from "./utils";

const DEFAULT_STAGE_NAME = "dev";

export class ApiGatewayRouter
  extends pulumi.ComponentResource
  implements IRouterInfraApi, IRouterCapturedProps, ResourceInfra
{
  public readonly name: string;
  public _url: pulumi.Output<string> = pulumi.interpolate`unkonwn`;

  private apiGateway: Api;
  private routes: Route[];

  constructor(name: string, opts?: RouterInfraOptions) {
    super("pluto:router:aws/ApiGateway", name, opts);
    this.name = name;

    this.apiGateway = new aws.apigatewayv2.Api(
      `${name}-apigateway`,
      {
        protocolType: "HTTP",
      },
      { parent: this }
    );

    const region = currentAwsRegion();
    this._url = pulumi.interpolate`https://${this.apiGateway.id}.execute-api.${region}.amazonaws.com/${DEFAULT_STAGE_NAME}`;

    this.routes = [];
  }

  public get url(): string {
    return this._url as any;
  }

  /**
   *
   * @param path The URL path to handle
   * @param fn
   */
  public get(path: string, fn: IResource): void {
    if (!(fn instanceof Lambda)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as Lambda;

    this.addHandler("GET", path, lambda);
  }

  public post(path: string, fn: IResource): void {
    if (!(fn instanceof Lambda)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as Lambda;

    this.addHandler("POST", path, lambda);
  }

  public put(path: string, fn: IResource): void {
    if (!(fn instanceof Lambda)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as Lambda;

    this.addHandler("PUT", path, lambda);
  }

  public delete(path: string, fn: IResource): void {
    if (!(fn instanceof Lambda)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as Lambda;

    this.addHandler("DELETE", path, lambda);
  }

  private addHandler(op: string, path: string, fn: Lambda) {
    assert(
      ["GET", "POST", "PUT", "DELETE"].indexOf(op.toUpperCase()) != -1,
      `${op} method not allowed`
    );
    const resourceNamePrefix = `${fn.name}-${path.replace("/", "_")}-${op}`;

    // 创建一个集成
    const integration = new aws.apigatewayv2.Integration(
      `${resourceNamePrefix}-apiIntegration`,
      {
        apiId: this.apiGateway.id,
        integrationType: "AWS_PROXY",
        integrationMethod: "POST",
        integrationUri: fn.lambda.invokeArn,
      },
      { parent: this }
    );

    // 创建一个路由
    const route = new aws.apigatewayv2.Route(
      `${resourceNamePrefix}-apiRoute`,
      {
        apiId: this.apiGateway.id,
        routeKey: `${op.toUpperCase()} ${path}`,
        target: pulumi.interpolate`integrations/${integration.id}`,
        authorizationType: "NONE",
      },
      { parent: this }
    );
    this.routes.push(route);

    // 创建一个 HTTP 触发器
    new aws.lambda.Permission(
      `${resourceNamePrefix}-httpTrigger`,
      {
        action: "lambda:InvokeFunction",
        function: fn.lambda.name,
        principal: "apigateway.amazonaws.com",
        sourceArn: pulumi.interpolate`${this.apiGateway.executionArn}/*`,
      },
      { parent: this }
    );
  }

  public getPermission(op: string, resource?: ResourceInfra) {
    op;
    resource;
    throw new Error("Method not implemented.");
  }

  public postProcess() {
    const deployment = new aws.apigatewayv2.Deployment(
      `${this.name}-deployment`,
      {
        apiId: this.apiGateway.id,
      },
      { dependsOn: this.routes, parent: this }
    );

    new aws.apigatewayv2.Stage(
      `${this.name}-stage`,
      {
        apiId: this.apiGateway.id,
        deploymentId: deployment.id,
        name: DEFAULT_STAGE_NAME, // TODO: modifiable
      },
      { parent: this }
    );
  }
}

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Api, Route } from "@pulumi/aws/apigatewayv2";
import { APIGatewayProxyHandler } from "aws-lambda";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import { HttpRequest, IRouterInfra, RequestHandler, Router, RouterOptions } from "@plutolang/pluto";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";
import { Lambda } from "./function.lambda";
import { currentAwsRegion } from "./utils";

const DEFAULT_STAGE_NAME = "dev";

export class ApiGatewayRouter
  extends pulumi.ComponentResource
  implements IRouterInfra, IResourceInfra
{
  public readonly id: string;

  public _url: pulumi.Output<string> = pulumi.interpolate`unkonwn`;

  private apiGateway: Api;
  private routes: Route[];

  constructor(name: string, opts?: RouterOptions) {
    super("pluto:router:aws/ApiGateway", name, opts);
    this.id = genResourceId(Router.fqn, name);

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

  public url(): string {
    return this._url as any;
  }

  /**
   *
   * @param path The URL path to handle
   * @param closure
   */
  public get(path: string, closure: ComputeClosure<RequestHandler>): void {
    this.addHandler("GET", path, closure);
  }

  public post(path: string, closure: ComputeClosure<RequestHandler>): void {
    this.addHandler("POST", path, closure);
  }

  public put(path: string, closure: ComputeClosure<RequestHandler>): void {
    this.addHandler("PUT", path, closure);
  }

  public delete(path: string, closure: ComputeClosure<RequestHandler>): void {
    this.addHandler("DELETE", path, closure);
  }

  private addHandler(op: string, path: string, closure: ComputeClosure<RequestHandler>) {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }
    const resourceNamePrefix = `${this.id}-${path.replace("/", "_")}-${op}`;

    const runtimeHandler = wrapClosure(adaptAwsRuntime(closure), closure);
    const lambda = new Lambda(runtimeHandler, {
      name: `${resourceNamePrefix}-func`,
    });

    // Create an integration
    const integration = new aws.apigatewayv2.Integration(
      genAwsResourceName(resourceNamePrefix, "integration"),
      {
        apiId: this.apiGateway.id,
        integrationType: "AWS_PROXY",
        integrationMethod: "POST",
        integrationUri: lambda.lambdaInvokeArn,
      },
      { parent: this }
    );

    // Create a route
    const route = new aws.apigatewayv2.Route(
      genAwsResourceName(resourceNamePrefix, "route"),
      {
        apiId: this.apiGateway.id,
        routeKey: `${op.toUpperCase()} ${path}`,
        target: pulumi.interpolate`integrations/${integration.id}`,
        authorizationType: "NONE",
      },
      { parent: this }
    );
    this.routes.push(route);

    // Create a trigger
    new aws.lambda.Permission(
      genAwsResourceName(resourceNamePrefix, "trigger"),
      {
        action: "lambda:InvokeFunction",
        function: lambda.lambdaName,
        principal: "apigateway.amazonaws.com",
        sourceArn: pulumi.interpolate`${this.apiGateway.executionArn}/*`,
      },
      { parent: this }
    );
  }

  public grantPermission(op: string, resource?: IResourceInfra) {
    op;
    resource;
    throw new Error("Method not implemented.");
  }

  public postProcess() {
    const deployment = new aws.apigatewayv2.Deployment(
      genAwsResourceName(this.id, "deployment"),
      {
        apiId: this.apiGateway.id,
      },
      { dependsOn: this.routes, parent: this }
    );

    new aws.apigatewayv2.Stage(
      genAwsResourceName(this.id, "stage"),
      {
        apiId: this.apiGateway.id,
        deploymentId: deployment.id,
        name: DEFAULT_STAGE_NAME, // TODO: modifiable
      },
      { parent: this }
    );
  }
}

/**
 * This function serves to bridge the gap between AWS runtime and Pluto, harmonizing their norms.
 * @param __handler_ The HTTP path handler contains the business logic.
 */
function adaptAwsRuntime(__handler_: RequestHandler): APIGatewayProxyHandler {
  return async (event, context) => {
    const accountId = context.invokedFunctionArn.split(":")[4];
    process.env["AWS_ACCOUNT_ID"] = accountId;

    const request: HttpRequest = {
      path: event.resource,
      method: event.httpMethod,
      headers: event.headers,
      query: event.queryStringParameters ?? {},
      body: event.body,
    };
    console.log("Pluto: Handling HTTP request: ", request);

    try {
      const result = await __handler_(request);
      return {
        statusCode: result.statusCode,
        body: result.body,
      };
    } catch (e) {
      console.log("Faild to handle http request: ", e);
      return {
        statusCode: 500,
        body: `Something wrong. Please contact the administrator.`,
      };
    }
  };
}

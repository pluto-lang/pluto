import { join } from "path";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Api, Route } from "@pulumi/aws/apigatewayv2";
import { APIGatewayProxyHandler } from "aws-lambda";
import { IResourceInfra, LanguageType } from "@plutolang/base";
import { currentLanguage, genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import {
  HttpRequest,
  IRouterInfra,
  RequestHandler,
  Router,
  RouterOptions,
  parseUrl,
} from "@plutolang/pluto";
import { genAwsResourceName } from "@plutolang/pluto/dist/clients/aws";
import { Lambda } from "./function.lambda";
import { currentAwsRegion } from "./utils";

const DEFAULT_STAGE_NAME = "dev";

export class ApiGatewayRouter
  extends pulumi.ComponentResource
  implements IRouterInfra, IResourceInfra
{
  public readonly id: string;

  public readonly _url: pulumi.Output<string>;

  private readonly apiGateway: Api;
  private readonly routes: Route[];

  public readonly outputs?: pulumi.Output<any>;

  constructor(name: string, opts?: RouterOptions) {
    super("pluto:router:aws/ApiGateway", name, opts);
    this.id = genResourceId(Router.fqn, name);

    const enableCORS = opts?.cors ?? true;
    this.apiGateway = new aws.apigatewayv2.Api(
      genAwsResourceName(this.id, "api"),
      {
        name: genAwsResourceName(this.id, "api"),
        protocolType: "HTTP",
        corsConfiguration: enableCORS
          ? {
              allowMethods: ["*"],
              allowOrigins: ["*"],
              allowHeaders: ["*"],
            }
          : undefined,
      },
      { parent: this }
    );

    this.routes = [];

    if (enableCORS) {
      // If CORS is enabled, create a default route to handle preflight requests.
      const route = new aws.apigatewayv2.Route(
        genAwsResourceName(this.id, "default-route"),
        {
          apiId: this.apiGateway.id,
          routeKey: "$default",
        },
        { parent: this }
      );
      this.routes.push(route);
    }

    const region = currentAwsRegion();
    this._url = pulumi.interpolate`https://${this.apiGateway.id}.execute-api.${region}.amazonaws.com/${DEFAULT_STAGE_NAME}`;
    this.outputs = this._url;
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

  public all(path: string, closure: ComputeClosure<RequestHandler>, raw?: boolean): void {
    this.addHandler("ANY", path, closure, raw);
  }

  private addHandler(
    op: string,
    path: string,
    closure: ComputeClosure<RequestHandler>,
    raw: boolean = false
  ) {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }
    const resourceNamePrefix = `${this.id}-${path.replace("/", "_")}-${op}`;

    const runtimeHandler = adaptPlatformNorm(closure, raw);
    const lambda = new Lambda(runtimeHandler, /* name */ `${resourceNamePrefix}-func`);

    // Create an integration
    const integration = new aws.apigatewayv2.Integration(
      genAwsResourceName(resourceNamePrefix, "integration"),
      {
        apiId: this.apiGateway.id,
        integrationType: "AWS_PROXY",
        integrationMethod: "POST",
        integrationUri: lambda.lambdaInvokeArn,
        timeoutMilliseconds: 30000,
      },
      { parent: this }
    );

    // Create a route
    const route = new aws.apigatewayv2.Route(
      genAwsResourceName(resourceNamePrefix, "route"),
      {
        apiId: this.apiGateway.id,
        routeKey: `${op.toUpperCase()} ${convertToAwsPath(path)}`,
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

function adaptAwsRuntimeRaw(__handler_: any): APIGatewayProxyHandler {
  return async (event, context, ...args: any[]) => {
    const accountId = context.invokedFunctionArn.split(":")[4];
    process.env["AWS_ACCOUNT_ID"] = accountId;
    return await __handler_(...[event, context, ...args]);
  };
}

function adaptPlatformNorm(
  closure: ComputeClosure<RequestHandler>,
  raw: boolean = false
): ComputeClosure<APIGatewayProxyHandler> {
  switch (currentLanguage()) {
    case LanguageType.TypeScript: {
      const adaptFunc = raw ? adaptAwsRuntimeRaw : adaptAwsRuntime;
      return wrapClosure(adaptFunc(closure), closure, {
        dirpath: "inline",
        exportName: "handler",
        placeholder: "__handler_",
      });
    }
    case LanguageType.Python: {
      const adaptFile = raw ? "apigateway_adapter_raw.py" : "apigateway_adapter.py";
      return wrapClosure(() => {}, closure, {
        dirpath: join(__dirname, adaptFile),
        exportName: "handler",
        placeholder: "__handler_",
      });
    }
    default:
      throw new Error(`Unsupported language: ${currentLanguage()}`);
  }
}

function convertToAwsPath(url: string): string {
  const parts = parseUrl(url);
  return (
    "/" +
    parts
      .map((part) => {
        if (part.isParam) {
          return `{${part.content}}`;
        }
        if (part.isWildcard) {
          return `{proxy+}`;
        }
        return part.content;
      })
      .join("/")
  );
}

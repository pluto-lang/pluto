import * as pulumi from "@pulumi/pulumi";
import * as alicloud from "@pulumi/alicloud";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure, wrapClosure } from "@plutolang/base/closure";
import { RequestHandler, RouterOptions, IRouterInfra, Router, HttpRequest } from "@plutolang/pluto";
import { genAliResourceName } from "@plutolang/pluto/dist/clients/alicloud";
import { FCInstance } from "./function.fc";
import { currentAliCloudRegion } from "./utils";

export class AppRouter extends pulumi.ComponentResource implements IRouterInfra, IResourceInfra {
  public readonly id: string;

  private readonly group: alicloud.apigateway.Group;
  private readonly app: alicloud.apigateway.App;
  private readonly role: alicloud.ram.Role;

  private _url: pulumi.Output<string>;

  constructor(name: string, opts?: RouterOptions) {
    super("pluto:router:alicloud/Api", name, opts);
    this.id = genResourceId(Router.fqn, name);

    const groupName = genAliResourceName(this.id, "group");
    this.group = new alicloud.apigateway.Group(
      groupName,
      {
        name: groupName,
        description: `${this.id}_group_pluto`,
      },
      { parent: this }
    );

    const appName = genAliResourceName(this.id, "app");
    this.app = new alicloud.apigateway.App(
      appName,
      {
        name: appName,
        description: `${this.id}_app_pluto`,
      },
      { parent: this }
    );

    // Create an API Gateway role to invoke functions.
    const roleName = genAliResourceName(this.id, "role");
    this.role = new alicloud.ram.Role(
      roleName,
      {
        name: roleName,
        document: `{
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": [
                  "apigateway.aliyuncs.com"
                ]
              }
            }
          ],
          "Version": "1"
        }`,
        description: `Pluto ${this.id} Api Role`,
      },
      { parent: this }
    );

    const policyName = genAliResourceName(this.id, "policy");
    const policy = new alicloud.ram.Policy(
      policyName,
      {
        policyName: policyName,
        // TODO: build the resource ARN
        policyDocument: pulumi.interpolate`{
          "Version": "1",
          "Statement": [
            {
              "Action": ["fc:InvokeFunction"],
              "Resource": "*",
              "Effect": "Allow"
            }
          ]
        }`,
        description: `${this.id}_policy_by_pluto`,
      },
      { parent: this }
    );

    const policyAttachmentName = genAliResourceName(this.id, "policy_attachment");
    new alicloud.ram.RolePolicyAttachment(
      policyAttachmentName,
      {
        policyName: policy.policyName,
        policyType: policy.type,
        roleName: this.role.name,
      },
      { parent: this }
    );

    this._url = pulumi.interpolate`https://${this.group.subDomain}`;
  }

  public url(): string {
    return this._url as any;
  }

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

  private addHandler(method: string, path: string, closure: ComputeClosure<RequestHandler>) {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }
    const resourceNamePrefix = `${this.id}-${path.replace("/", "_")}-${method}`;

    const runtimeHandler = wrapClosure(adaptAliCloudRuntime(closure), closure);
    const fnResource = new FCInstance(runtimeHandler, {
      name: `${resourceNamePrefix}-func`,
    });

    const apiName = genAliResourceName(resourceNamePrefix, `api`);
    const api = new alicloud.apigateway.Api(
      apiName,
      {
        name: apiName,
        authType: "ANONYMOUS",
        description: `${resourceNamePrefix}_api_by_pluto`,
        groupId: this.group.id,
        requestConfig: {
          method: method,
          mode: "PASSTHROUGH",
          path: path,
          protocol: "HTTPS",
        },
        serviceType: "FunctionCompute",
        fcServiceConfig: {
          functionName: fnResource.fcInstance.name,
          region: currentAliCloudRegion(),
          serviceName: fnResource.fcService.name,
          arnRole: this.role.arn,
          timeout: 30 * 1000, // ms
        },
        stageNames: ["RELEASE", "TEST", "PRE"],
      },
      { parent: this }
    );

    const appAttachmentName = genAliResourceName(resourceNamePrefix, `app_attachment`);
    new alicloud.apigateway.AppAttachment(
      appAttachmentName,
      {
        apiId: api.apiId,
        groupId: this.group.id,
        appId: this.app.id,
        stageName: "PRE", // PRE, RELEASE, TEST
      },
      { parent: this }
    );
  }

  public grantPermission(op: string, resource?: IResourceInfra) {
    op;
    resource;
    throw new Error("Method not implemented.");
  }

  public postProcess(): void {}
}

type CallbackFn = (error: Error | null, data?: object) => Promise<void>;

function adaptAliCloudRuntime(__handler_: RequestHandler) {
  return async (inData: Buffer, context: any, callback: CallbackFn) => {
    const accountId = context.accountId;
    process.env["ALICLOUD_ACCOUNT_ID"] = accountId;

    const event = JSON.parse(inData.toString());
    const request: HttpRequest = {
      path: event.path,
      method: event.httpMethod,
      headers: event.headers,
      query: event.queryParameters ?? {},
      body: event.body,
    };
    console.log("Pluto: Handling HTTP request: ", request);

    try {
      const respData = await __handler_(request);
      if (respData.statusCode === 200) {
        callback(null, {
          isBase64Encoded: false,
          statusCode: respData.statusCode,
          headers: {},
          body: JSON.stringify(respData.body),
        });
      } else {
        callback(new Error(respData.body));
      }
    } catch (e) {
      console.log("Failed to handle http request: ", e);
      callback(new Error("Internal Server Error"));
    }
  };
}

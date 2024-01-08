import * as pulumi from "@pulumi/pulumi";
import { IResource, ResourceInfra } from "@plutolang/base";
import { RequestHandler, IRouterInfraApi, RouterInfraOptions } from "@plutolang/pluto";
import * as alicloud from "@pulumi/alicloud";
import { FCFnResource } from "./fcFnResource";
import { formatName } from "./utils";

const REGION = process.env.ALICLOUD_REGION;

export class AppRouter extends pulumi.ComponentResource implements IRouterInfraApi, ResourceInfra {
  readonly name: string;

  private readonly group: alicloud.apigateway.Group;
  private readonly app: alicloud.apigateway.App;
  private readonly role: alicloud.ram.Role;

  private _url: pulumi.Output<string> = pulumi.interpolate`unkonwn`;

  constructor(name: string, args?: RouterInfraOptions, opts?: pulumi.ComponentResourceOptions) {
    if (REGION == undefined) {
      throw new Error(`Please set the environment variable ALICLOUD_REGION`);
    }

    super("pluto:router:alicloud/Api", name, args, opts);
    this.name = name;

    const groupName = formatName(`${name}_group`);
    this.group = new alicloud.apigateway.Group(
      groupName,
      {
        name: groupName,
        description: `${name}_group_pluto`,
      },
      { parent: this }
    );
    const appName = formatName(`${name}_app`);
    this.app = new alicloud.apigateway.App(
      appName,
      {
        name: appName,
        description: `${name}_app_pluto`,
      },
      { parent: this }
    );

    // Create an API Gateway role to invoke functions.
    const roleName = formatName(`${name}_role`);
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
        description: `Pluto ${name} Api Role`,
      },
      { parent: this }
    );
    const policyName = formatName(`${name}_policy`);
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
        description: `${name}_policy_by_pluto`,
      },
      { parent: this }
    );
    new alicloud.ram.RolePolicyAttachment(
      `${name}_policy_attachment`,
      {
        policyName: policy.policyName,
        policyType: policy.type,
        roleName: this.role.name,
      },
      { parent: this }
    );

    this._url = pulumi.interpolate`https://${this.group.subDomain}`;
  }

  public get url(): string {
    return this._url as any;
  }

  public get(path: string, fn: IResource): void {
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
    const resourceNamePrefix = `${fnResource.name}_${path.replace("/", "_")}_${method}`;

    const apiName = formatName(`${resourceNamePrefix}_api`);
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
          region: REGION!,
          serviceName: fnResource.fcService.name,
          arnRole: this.role.arn,
          timeout: 30 * 1000, // ms
        },
        stageNames: ["RELEASE", "TEST", "PRE"],
      },
      { parent: this }
    );
    new alicloud.apigateway.AppAttachment(
      `${resourceNamePrefix}_app_attachment`,
      {
        apiId: api.apiId,
        groupId: this.group.id,
        appId: this.app.id,
        stageName: "PRE", // PRE, RELEASE, TEST
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

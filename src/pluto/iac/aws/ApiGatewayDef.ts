import * as aws from "@pulumi/aws"
import { Api, Route } from "@pulumi/aws/apigatewayv2";
import * as pulumi from "@pulumi/pulumi"
import { LambdaDef } from "./LambdaDef";
import { assert } from "console";
import { BaasResource, FaasResource, RouterDef, RouterOptions } from "@pluto/pluto";

export class ApiGatewayDef extends BaasResource implements RouterDef {
    apiGateway: Api;
    routes: Route[];
    url: pulumi.Output<string> = pulumi.interpolate`unkonwn`;

    constructor(name: string, opts?: RouterOptions) {
        super("pluto:aws:ApiGateway", name, opts);

        this.apiGateway = new aws.apigatewayv2.Api(`${name}-apigateway`, {
            protocolType: "HTTP",
        });

        this.routes = [];

        this.registerOutputs({
            endpoint: this.apiGateway.apiEndpoint,
        });
    }

    public get(path: string, fn: FaasResource): void {
        if (!(fn instanceof LambdaDef)) throw new Error('Fn is not a subclass of LambdaDef.');
        const lambda = fn as LambdaDef

        this.addHandler('GET', path, lambda)
    }

    private addHandler(op: string, path: string, fn: LambdaDef) {
        assert(["GET", "POST", "PUT", "DELETE"].indexOf(op.toUpperCase()) != -1, `${op} method not allowed`);
        const resourceNamePrefix = `${fn.name}-${path.replace('/', '_')}-${op}`

        // 创建一个集成
        const integration = new aws.apigatewayv2.Integration(`${resourceNamePrefix}-apiIntegration`, {
            apiId: this.apiGateway.id,
            integrationType: "AWS_PROXY",
            integrationMethod: "POST",
            integrationUri: fn.lambda.invokeArn,
        });

        // 创建一个路由
        const route = new aws.apigatewayv2.Route(`${resourceNamePrefix}-apiRoute`, {
            apiId: this.apiGateway.id,
            routeKey: `${op.toUpperCase()} ${path}`,
            target: pulumi.interpolate`integrations/${integration.id}`,
            authorizationType: "NONE",
        });
        this.routes.push(route);

        // 创建一个 HTTP 触发器
        new aws.lambda.Permission(`${resourceNamePrefix}-httpTrigger`, {
            action: "lambda:InvokeFunction",
            function: fn.lambda.name,
            principal: "apigateway.amazonaws.com",
            sourceArn: pulumi.interpolate`${this.apiGateway.executionArn}/*`
        })
    }

    postProcess() {
        const deployment = new aws.apigatewayv2.Deployment(`${this.name}-deployment`, {
            apiId: this.apiGateway.id,
        }, { dependsOn: this.routes });

        const stage = new aws.apigatewayv2.Stage(`${this.name}-stage`, {
            apiId: this.apiGateway.id,
            deploymentId: deployment.id,
            name: "dev",
        })
        this.url = stage.invokeUrl
    }
}
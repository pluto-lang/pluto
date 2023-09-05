//link:Router
import * as aws from "@pulumi/aws"
import { Api, Stage } from "@pulumi/aws/apigatewayv2";
import * as pulumi from "@pulumi/pulumi"
import { LambdaDef } from "./LambdaDef";
import { assert } from "console";

export class ApiGatewayDef extends pulumi.ComponentResource {
    name: string;

    apiGateway: Api;

    constructor(name: string, opts?: {}) {
        super("pluto:aws:ApiGateway", name, opts);
        this.name = name;

        this.apiGateway = new aws.apigatewayv2.Api(`${name}-apigateway`, {
            protocolType: "HTTP"
        });

        const deployment = new aws.apigatewayv2.Deployment("myDeployment", {
            apiId: this.apiGateway.id,
        });

        const stage = new aws.apigatewayv2.Stage(`${name}-stage`, {
            apiId: this.apiGateway.id,
            deploymentId: deployment.id,
            name: "dev",
        })

        this.registerOutputs({
            Endpoint: this.apiGateway.apiEndpoint,
        });
    }

    addHandler(op: string, fn: LambdaDef, params: { [key: string]: any }) {
        assert(["GET", "POST", "PUT", "DELETE"].indexOf(op.toUpperCase()) != -1, `${op} method not allowed`);
        const path = params['path'];
        const resourceNamePrefix = `${fn.name}-${path.replace('/', '_')}-${op}`

        // 创建一个集成
        const integration = new aws.apigatewayv2.Integration(`${resourceNamePrefix}-apiIntegration`, {
            apiId: this.apiGateway.id,
            integrationType: "AWS_PROXY",
            integrationMethod: "POST",
            integrationUri: fn.lambda.invokeArn,
        });

        // 创建一个路由
        new aws.apigatewayv2.Route(`${resourceNamePrefix}-apiRoute`, {
            apiId: this.apiGateway.id,
            routeKey: `${op.toUpperCase()} ${path}`,
            target: pulumi.interpolate `integrations/${integration.id}`,
            authorizationType: "NONE",
        });

        // 创建一个 HTTP 触发器
        new aws.lambda.Permission(`${resourceNamePrefix}-httpTrigger`, {
            action: "lambda:InvokeFunction",
            function: fn.lambda.name,
            principal: "apigateway.amazonaws.com",
            sourceArn: pulumi.interpolate `${ this.apiGateway.executionArn }/*`
        })
    }
}
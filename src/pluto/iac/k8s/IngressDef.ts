import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { BaasResource, FaasResource, Request, RouterDef, RouterOptions } from "@pluto/pluto";
import { ServiceDef } from "./ServiceDef";


export class IngressDef extends BaasResource implements RouterDef {
    url: pulumi.Output<string>;
    routes: { path: string, handler: ServiceDef }[];

    constructor(name: string, args?: RouterOptions, opts?: pulumi.ComponentResourceOptions) {
        super("pluto:k8s:Ingress", name, args, opts);
        this.routes = [];
        this.url = pulumi.interpolate`unknown`;
    }

    get(path: string, fn: FaasResource): void {
        const handler = fn as ServiceDef;
        this.routes.push({ path, handler });
    }

    public postProcess(): void {
        const appLabels = { app: this.name };

        const paths: pulumi.Input<k8s.types.input.networking.v1.HTTPIngressPath>[] = []
        this.routes.forEach(item => {
            paths.push({
                path: item.path,
                pathType: "ImplementationSpecific",
                backend: {
                    service: {
                        name: item.handler.service.metadata.name,
                        port: { number: 80 }
                    }
                }
            })
        })

        this.url = pulumi.interpolate`${this.name}.localdev.me`

        const ingress = new k8s.networking.v1.Ingress(`${this.name}-ingress`, {
            metadata: {
                labels: appLabels,
                annotations: {
                    'pulumi.com/skipAwait': 'true'
                }
            },
            spec: {
                ingressClassName: "nginx",
                rules: [{
                    host: this.url,
                    http: {
                        paths: paths,
                    }
                }],
            },
        }, { parent: this });
    }
}
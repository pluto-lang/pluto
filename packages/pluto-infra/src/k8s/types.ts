import * as pulumi from "@pulumi/pulumi";

/** @internal */
export interface Metadata {
  readonly apiVersion: string | pulumi.Output<string>;
  readonly kind: string | pulumi.Output<string>;
  readonly name: string | pulumi.Output<string>;
}

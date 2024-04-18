import url from "url";
import http from "http";
import * as pulumi from "@pulumi/pulumi";

/** @internal */
export interface Metadata {
  readonly apiVersion: string | pulumi.Output<string>;
  readonly kind: string | pulumi.Output<string>;
  readonly name: string | pulumi.Output<string>;
}

interface ParsedItem {
  readonly url: url.UrlWithParsedQuery;
  readonly body?: string;
}

/**
 * This is the standard for the Kubernetes runtime handler. Each resource should utilize a function
 * to adapt the business function to this standard. The base runtime is responsible for transforming
 * the raw request format to this format, and then transferring the transformed result to this
 * handler.
 *
 * Business Function
 *    ^
 *    |
 * Resource Adapter  <--- This function should be a RuntimeHandler, and implemented by the resource.
 *    ^
 *    |
 * Base Runtime <--- This function should receive the raw request and transfer it to the format of
 * the argument of the RuntimeHandler. It then calls the resource adapter.
 *    ^
 *    |
 * Kubernetes Pod
 *
 */
export type RuntimeHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  parsedItem: ParsedItem
) => Promise<void>;

import http from "http";
import express from "express";
import { simulator } from "@plutolang/base";
import { HttpRequest, IRouterClient, RequestHandler, RouterOptions } from "@plutolang/pluto";
import { findAvailablePort } from "../utils";
import { ComputeClosure } from "@plutolang/base/closure";

const VALID_HTTP_METHODS = ["get", "post", "put", "delete", "head", "options", "patch", "connect"];

export class SimRouter implements simulator.IResourceInstance, IRouterClient {
  private readonly expressApp: express.Application;
  private httpServer?: http.Server;
  private port?: number;

  private cleaned: boolean = false;

  constructor(name: string, opts?: RouterOptions) {
    this.expressApp = express();
    const portP = findAvailablePort();
    portP.then((port) => {
      this.port = port;
      this.httpServer = this.expressApp.listen(port);
      if (this.cleaned && this.httpServer) {
        // There's a possibility that the router may be cleaned up before the http server even
        // starts. If the 'cleaned' flag is set to true and 'httpServer' is not undefined, it
        // indicates that the router was cleaned up before the server's initiation. Therefore, it's
        // necessary to close the server in this scenario.
        this.httpServer.close();
        this.httpServer = undefined;
      }
    });
    name;
    opts;
  }

  public url(): string {
    if (!this.port) {
      throw new Error("The router is not running yet.");
    }
    return `http://localhost:${this.port}`;
  }

  public async setup() {}

  public addEventHandler(op: string, args: any[]): void {
    if (VALID_HTTP_METHODS.indexOf(op.toLocaleLowerCase()) === -1) {
      throw new Error(`Invalid HTTP method: ${op}`);
    }
    const method = op.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete"
      | "head"
      | "options"
      | "patch"
      | "connect";
    const path = args[0] as string;
    const closure = args[1] as ComputeClosure<RequestHandler>;

    this.expressApp[method](
      path,
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const reqPluto: HttpRequest = {
          path: req.path,
          method: req.method,
          headers: {},
          query: {},
          body: req.body,
        };
        for (const key in req.query) {
          reqPluto.query[key] = req.query[key] as string;
        }

        try {
          const resp = await closure(reqPluto);
          res.status(resp.statusCode).end(resp.body);
        } catch (e) {
          return next(e);
        }
      }
    );
  }

  public async cleanup(): Promise<void> {
    this.cleaned = true;
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = undefined;
    }
  }
}

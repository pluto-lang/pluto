import express from "express";
import { simulator } from "@plutolang/base";
import { HttpRequest, HttpResponse, RouterOptions } from "@plutolang/pluto";
import { SimFunction } from "./function";

const VALID_HTTP_METHODS = ["get", "post", "put", "delete", "head", "options", "patch", "connect"];

export class SimRouter implements simulator.IResourceInstance {
  private context?: simulator.IContext;
  private readonly expressApp: express.Application;

  constructor(name: string, opts?: RouterOptions) {
    this.expressApp = express();
    name;
    opts;
  }

  public async setup(context: simulator.IContext) {
    this.context = context;
  }

  public addEventHandler(op: string, args: string, fnResourceId: string): void {
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
    const path = JSON.parse(args)[0] as string;

    const context = this.context!;
    this.expressApp[method](
      path,
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const fn = context.findInstance(fnResourceId) as SimFunction;

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
          const resp = (await fn.invoke(JSON.stringify(reqPluto))) as HttpResponse;
          res.status(resp.statusCode).send(resp.body);
        } catch (e) {
          return next(e);
        }
      }
    );
  }

  public async cleanup(): Promise<void> {}
}

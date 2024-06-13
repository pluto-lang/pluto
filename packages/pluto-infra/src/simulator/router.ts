import http from "http";
import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import { IResourceInfra } from "@plutolang/base";
import {
  HttpRequest,
  IRouterClient,
  IRouterInfra,
  RequestHandler,
  Router,
  RouterOptions,
} from "@plutolang/pluto";
import { ComputeClosure } from "@plutolang/base/closure";
import { genResourceId } from "@plutolang/base/utils";
import { SimFunction } from "./function";

const VALID_HTTP_METHODS = ["get", "post", "put", "delete"];

export class SimRouter implements IResourceInfra, IRouterInfra, IRouterClient {
  public readonly id: string;

  private readonly expressApp: express.Application;
  private httpServer: http.Server;
  private port: number;

  public outputs: string;

  constructor(name: string, opts?: RouterOptions) {
    this.id = genResourceId(Router.fqn, name);

    this.expressApp = express();
    this.expressApp.use(cors());
    this.expressApp.use(bodyParser.urlencoded({ extended: false }));
    this.expressApp.use(bodyParser.json());

    this.httpServer = this.expressApp.listen(0);
    const address = this.httpServer.address();
    if (address && typeof address !== "string") {
      this.port = address.port;
    } else {
      throw new Error(`Failed to obtain the port for the router: ${name}`);
    }
    this.outputs = this.url();

    name;
    opts;
  }

  public url(): string {
    return `http://localhost:${this.port}`;
  }

  public async setup() {}

  public get(path: string, closure: ComputeClosure<RequestHandler>) {
    this.addEventHandler("get", [path, closure]);
  }

  public post(path: string, closure: ComputeClosure<RequestHandler>) {
    this.addEventHandler("post", [path, closure]);
  }

  public put(path: string, closure: ComputeClosure<RequestHandler>) {
    this.addEventHandler("put", [path, closure]);
  }

  public delete(path: string, closure: ComputeClosure<RequestHandler>) {
    this.addEventHandler("delete", [path, closure]);
  }

  public all(path: string, closure: ComputeClosure<RequestHandler>) {
    for (const method of VALID_HTTP_METHODS) {
      this.addEventHandler(method, [path, closure]);
    }
  }

  private addEventHandler(op: string, args: any[]): void {
    if (VALID_HTTP_METHODS.indexOf(op.toLocaleLowerCase()) === -1) {
      throw new Error(`Invalid HTTP method: ${op}`);
    }
    const method = op.toLowerCase() as "get" | "post" | "put" | "delete";
    const path = args[0] as string;
    const closure = args[1] as ComputeClosure<RequestHandler>;

    const func = new SimFunction(closure);

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
          const resp = await func.invoke(reqPluto);
          // TODO: unify the response format
          res.status(resp.statusCode ?? resp.status_code).end(resp.body);
        } catch (e) {
          return next(e);
        }
      }
    );
  }

  public async cleanup(): Promise<void> {
    if (this.httpServer) {
      this.httpServer.close();
    }
  }

  public grantPermission() {}
  public postProcess(): void {}
}

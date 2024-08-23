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

/**
 * Adapts the options to the correct names for TypeScript.
 * The option names for TypeScript and Python are different, so this function converts Python-style
 * option names to TypeScript-style option names.
 *
 * @param opts - The options object that may contain Python-style option names.
 * @returns The adapted options object with TypeScript-style option names.
 */
function adaptOptions(opts?: any): RouterOptions | undefined {
  if (opts === undefined) {
    return;
  }

  if (opts.sim_host) {
    opts.simHost = opts.sim_host;
  }
  if (opts.sim_port) {
    opts.simPort = opts.sim_port;
  }
  return opts;
}

export class SimRouter implements IResourceInfra, IRouterInfra, IRouterClient {
  public readonly id: string;

  private expressApp?: express.Express;
  private httpServer?: http.Server;
  private host: string;
  private port: number;

  public outputs?: string;

  constructor(name: string, opts?: RouterOptions) {
    opts = adaptOptions(opts);

    this.id = genResourceId(Router.fqn, name);

    this.host = opts?.simHost ?? "localhost";
    this.port = parseInt(opts?.simPort ?? "0");
  }

  public async init() {
    this.expressApp = express();
    this.expressApp.use(cors());
    this.expressApp.use(bodyParser.urlencoded({ extended: false }));
    this.expressApp.use(bodyParser.json());

    const httpServer = this.expressApp.listen(this.port, this.host);
    this.httpServer = httpServer;

    async function waitForServerReady() {
      return await new Promise<number>((resolve, reject) => {
        httpServer.on("listening", () => {
          const address = httpServer.address();
          if (address && typeof address !== "string") {
            resolve(address.port);
          } else {
            reject(new Error(`Failed to obtain the port for the router`));
          }
        });

        httpServer.on("error", (err) => {
          console.error(err);
          reject(err);
        });
      });
    }
    const realPort = await waitForServerReady();
    this.port = realPort;

    this.outputs = this.url();
  }

  public url(): string {
    return `http://${this.host}:${this.port}`;
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

    this.expressApp![method](
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

import fs from "fs";
import path from "path";
import cors from "cors";
import express from "express";
import { IResourceInfra } from "@plutolang/base";
import { IWebsiteClient, IWebsiteInfra, Website, WebsiteOptions } from "@plutolang/pluto";
import { genResourceId } from "@plutolang/base/utils";

/**
 * Adapts the options to the correct names for TypeScript.
 * The option names for TypeScript and Python are different, so this function converts Python-style
 * option names to TypeScript-style option names.
 *
 * @param opts - The options object that may contain Python-style option names.
 * @returns The adapted options object with TypeScript-style option names.
 */
function adaptOptions(opts?: any): WebsiteOptions | undefined {
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

export class SimWebsite implements IResourceInfra, IWebsiteInfra, IWebsiteClient {
  public id: string;
  private websiteDir: string;

  private envs: { [key: string]: string } = {};
  private originalPlutoJs: string | undefined;

  private host: string;
  private port: number;

  public outputs?: string;

  constructor(path: string, name?: string, options?: WebsiteOptions) {
    name = name ?? "default";
    options = adaptOptions(options);

    this.id = genResourceId(Website.fqn, name);
    this.websiteDir = path;

    this.host = options?.simHost ?? "localhost";
    this.port = parseInt(options?.simPort ?? "0");
  }

  public async init() {
    const expressApp = express();
    expressApp.use(cors());
    expressApp.use(express.static(this.websiteDir));

    const httpServer = expressApp.listen(this.port, this.host);

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

  public addEnv(key: string, value: string): void {
    this.envs[key] = value;
  }

  public grantPermission() {}

  public postProcess(): void {
    function dumpPlutoJs(filepath: string, envs: { [key: string]: string }) {
      const content = PLUTO_JS_TEMPALETE.replace("{placeholder}", JSON.stringify(envs, null, 2));
      fs.writeFileSync(filepath, content);
    }

    const filepath = path.join(this.websiteDir, "pluto.js");
    // Developers may have previously constructed a `pluto.js` file to facilitate debugging
    // throughout the development process. Therefore, it's essential to back up the original
    // content of `pluto.js` and ensure it's restored after deployment.
    this.originalPlutoJs = fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf8") : undefined;

    dumpPlutoJs(filepath, this.envs);
  }

  public cleanup(): void {
    const plutoJsPath = path.join(this.websiteDir, "pluto.js");
    fs.rmSync(plutoJsPath);
    if (this.originalPlutoJs) {
      fs.writeFileSync(plutoJsPath, this.originalPlutoJs);
    }
  }
}

const PLUTO_JS_TEMPALETE = `
window.plutoEnv = {placeholder}
`;

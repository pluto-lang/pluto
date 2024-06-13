import fs from "fs";
import http from "http";
import path from "path";
import cors from "cors";
import express from "express";
import { IResourceInfra } from "@plutolang/base";
import { IWebsiteClient, IWebsiteInfra, Website, WebsiteOptions } from "@plutolang/pluto";
import { genResourceId } from "@plutolang/base/utils";

export class SimWebsite implements IResourceInfra, IWebsiteInfra, IWebsiteClient {
  public id: string;
  private websiteDir: string;

  private envs: { [key: string]: string } = {};
  private originalPlutoJs: string | undefined;

  private expressApp: express.Application;
  private httpServer: http.Server;
  private port: number;

  public outputs: string;

  constructor(path: string, name?: string, options?: WebsiteOptions) {
    name = name ?? "default";
    this.id = genResourceId(Website.fqn, name);
    this.websiteDir = path;

    this.expressApp = express();
    this.expressApp.use(cors());
    this.expressApp.use(express.static(this.websiteDir));

    this.httpServer = this.expressApp.listen(0);
    const address = this.httpServer.address();
    if (address && typeof address !== "string") {
      this.port = address.port;
    } else {
      throw new Error(`Failed to obtain the port for the router: ${name}`);
    }

    this.outputs = this.url();

    options;
  }

  public url(): string {
    return `http://localhost:${this.port}`;
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

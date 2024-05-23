import * as path from "path";
import { execSync } from "child_process";
import * as pulumi from "@pulumi/pulumi";
import { ReactAppOptions } from "@plutolang/pluto";
import { IWebsiteInfraImpl, Website } from "./website";

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and provisioning engine.
 */
export abstract class ReactApp {
  /**
   * Asynchronously creates an instance of the ReactApp infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(
    reactAppPath: string,
    name?: string,
    options?: ReactAppOptions
  ): Promise<IWebsiteInfraImpl> {
    const projectRoot = new pulumi.Config("pluto").require("projectRoot");

    const appAbsolutPath = path.resolve(projectRoot, reactAppPath);
    const buildPath = path.join(appAbsolutPath, options?.buildDir ?? "build");
    const buildCommand = options?.buildCommand ?? "npm run build";

    execSync(buildCommand, {
      cwd: appAbsolutPath,
      env: {
        ...process.env,
        BUILD_PATH: buildPath,
      },
    });

    return Website.createInstance(buildPath, name, options);
  }
}

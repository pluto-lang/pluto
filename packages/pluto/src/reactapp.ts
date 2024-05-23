import { IResource } from "@plutolang/base";
import { IWebsiteClient, Website, WebsiteOptions } from "./website";

/**
 * The options for instantiating a resource class.
 */
export interface ReactAppOptions extends WebsiteOptions {
  /**
   * The directory path to the React app build output, relative to the project path.
   * @default "build"
   */
  buildDir?: string;
  /**
   * The command for building the React app.
   * @default "npm run build"
   */
  buildCommand?: string;
}

/**
 * The ReactApp resource type.
 */
export class ReactApp implements IResource {
  /**
   * The fully qualified name of the resource type.
   */
  public static fqn = "@plutolang/pluto.ReactApp";

  constructor(projectPath: string, name?: string, options?: ReactAppOptions) {
    name;
    projectPath;
    options;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(
    projectPath: string,
    name?: string,
    options?: ReactAppOptions
  ): IWebsiteClient {
    return Website.buildClient(projectPath, name, options);
  }
}

export interface ReactApp extends Website {}

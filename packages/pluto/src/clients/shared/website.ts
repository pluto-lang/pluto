import { utils } from "@plutolang/base";
import { IWebsiteClient, Website, WebsiteOptions } from "../../website";

export class WebsiteClient implements IWebsiteClient {
  private readonly id: string;

  constructor(path: string, name?: string, opts?: WebsiteOptions) {
    name = name ?? "default";
    this.id = utils.genResourceId(Website.fqn, name);
    path;
    opts;
  }

  public url(): string {
    return utils.getEnvValForProperty(this.id, "url");
  }
}

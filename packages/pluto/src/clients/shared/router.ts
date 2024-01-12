import { utils } from "@plutolang/base";
import { IRouterClient, RouterOptions } from "../../router";

export class RouterClient implements IRouterClient {
  private readonly id: string;

  constructor(name: string, opts?: RouterOptions) {
    this.id = utils.genResourceId(utils.currentProjectName(), utils.currentStackName(), name);
    opts;
  }

  get url(): string {
    return utils.getEnvValForProperty("Router", this.id, "url");
  }
}

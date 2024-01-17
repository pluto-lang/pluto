import { utils } from "@plutolang/base";
import { IRouterClient, RouterOptions } from "../../router";

export class RouterClient implements IRouterClient {
  private readonly id: string;

  constructor(name: string, opts?: RouterOptions) {
    this.id = utils.genResourceId("@plutolang/pluto.Router", name);
    opts;
  }

  url(): string {
    return utils.getEnvValForProperty(this.id, "url");
  }
}

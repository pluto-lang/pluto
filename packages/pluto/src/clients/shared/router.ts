import { utils } from "@plutolang/base";
import { IRouterCapturedProps, RouterOptions } from "../../router";

export class RouterClient implements IRouterCapturedProps {
  private readonly id: string;

  constructor(name: string, opts?: RouterOptions) {
    this.id = utils.genResourceId(utils.currentProjectName(), utils.currentStackName(), name);
    opts;
  }

  get url(): string {
    return utils.getEnvValForProperty("Router", this.id, "url");
  }
}

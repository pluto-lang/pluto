import { utils } from "@plutolang/base";
import { IRouterCapturedProps, Router, RouterOptions } from "../../router";

export class RouterClient extends Router implements IRouterCapturedProps {
  private readonly id: string;

  constructor(name: string, opts?: RouterOptions) {
    super(name, opts);

    this.id = utils.genResourceId(utils.currentProjectName(), utils.currentStackName(), name);
  }

  get url(): string {
    return utils.getEnvValForProperty(Router.name, this.id, "url");
  }
}

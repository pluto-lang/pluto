/* eslint-disable */
import { IResourceClientApi } from "@plutolang/base";

interface ResourceClientApi extends IResourceClientApi {
  method(): string;
}

interface Resource extends ResourceClientApi {}

class Resource {}

const resource = new Resource();
resource.method();

const aliasResource = resource;
aliasResource.method();

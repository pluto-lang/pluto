import { IResourceInfraApi } from "@plutolang/base";

interface ResourceInfraApi extends IResourceInfraApi {
  method(): string;
}

interface Resource extends ResourceInfraApi {}

class Resource {}

const resource = new Resource();
resource.method();

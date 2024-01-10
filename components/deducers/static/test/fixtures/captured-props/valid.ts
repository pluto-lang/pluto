/* eslint-disable */
import { IResourceCapturedProps } from "@plutolang/base";

interface ResourceCapturedProps extends IResourceCapturedProps {
  get oneProp(): string;
}

interface Resource extends ResourceCapturedProps {}

class Resource {}

const resource = new Resource();
resource.oneProp;

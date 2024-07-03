interface ArgumentBase {
  index: number;
  type: "text" | "closure" | "capturedProperty" | "resource";
  name: string;
}

export interface TextArgument extends ArgumentBase {
  type: "text";
  value: string;
}

export namespace TextArgument {
  export function create(index: number, name: string, value: string): TextArgument {
    return {
      index,
      name,
      type: "text",
      value,
    };
  }
}

export interface ResourceArgument extends ArgumentBase {
  type: "resource";
  resourceId: string;
}

export namespace ResourceArgument {
  export function create(index: number, name: string, resourceId: string): ResourceArgument {
    return {
      index,
      name,
      type: "resource",
      resourceId,
    };
  }
}

export interface BundleArgument extends ArgumentBase {
  type: "closure";
  closureId: string;
}

export namespace ClosureArgument {
  export function create(index: number, name: string, closureId: string): BundleArgument {
    return {
      index,
      name,
      type: "closure",
      closureId,
    };
  }
}

export interface CapturedPropertyArgument extends ArgumentBase {
  type: "capturedProperty";
  resourceId: string;
  property: string;
}

export namespace CapturedPropertyArgument {
  export function create(
    index: number,
    name: string,
    resourceId: string,
    property: string
  ): CapturedPropertyArgument {
    return {
      index,
      name,
      type: "capturedProperty",
      resourceId,
      property,
    };
  }
}

export type Argument = TextArgument | ResourceArgument | BundleArgument | CapturedPropertyArgument;

export namespace Argument {
  export function stringify(arg: Argument): string {
    switch (arg.type) {
      case "text":
        return arg.value;
      case "resource":
        return arg.resourceId;
      case "closure":
        return arg.closureId;
      case "capturedProperty":
        return `${arg.resourceId}.${arg.property}()`;
    }
  }
}

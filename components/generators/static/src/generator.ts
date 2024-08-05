import path from "path";
import assert from "assert";
import * as ts from "typescript";
import { LanguageType, arch, core } from "@plutolang/base";
import { writeToFile } from "./utils";

// The name of the compiled entrypoint
const ENTRYPOINT_FILENAME = "pulumi";

export class StaticGenerator extends core.Generator {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(path.join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(path.join(__dirname, "../package.json")).version;

  constructor(args: core.NewGeneratorArgs) {
    super(args);
  }

  public async generate(archRef: arch.Architecture, outdir: string): Promise<core.GenerateResult> {
    const pirTsCode = this.generateInfraCode(archRef);
    writeToFile(outdir, ENTRYPOINT_FILENAME + ".ts", pirTsCode);
    const pirJsCode = compileTs(pirTsCode);
    writeToFile(outdir, ENTRYPOINT_FILENAME + ".js", pirJsCode);

    return { entrypoint: path.join(outdir, ENTRYPOINT_FILENAME + ".js") };
  }

  private generateInfraCode(archRef: arch.Architecture): string {
    const entities = archRef.topoSort();

    const globalImports = `import { createClosure } from "@plutolang/base/closure";`;
    let infraCode = ``;
    for (const entity of entities) {
      switch (entity.type) {
        case arch.EntityType.Resource:
          infraCode += this.generateInfraCode_Resource(entity.resource);
          break;
        case arch.EntityType.Bundle:
          infraCode += this.generateInfraCode_Closure(entity.closure, archRef);
          break;
        case arch.EntityType.Relationship:
          infraCode += this.generateInfraCode_Relationship(entity.relationship);
          break;
        default:
          throw new Error(`Unsupported entity type ` + JSON.stringify(entity));
      }
    }

    // Append the postProcess calling for each resource.
    entities
      .filter((entity) => entity.type === arch.EntityType.Resource)
      .forEach((entity) => {
        const resource = (entity as arch.ResourceEntity).resource;
        infraCode += `${resource.id}.postProcess();\n`;
      });

    // Append the output items of each resource.
    // TODO: Currently, these outputs are only utilized during testing. We need to evaluate their
    // necessity, as this approach requires the SDK developer to specifically write outputs for
    // certain resources, which may not be developer-friendly.
    const outputItems = entities
      .filter((entity) => entity.type === arch.EntityType.Resource)
      .map((entity) => {
        const resource = (entity as arch.ResourceEntity).resource;
        return `${resource.id}: ${resource.id}.outputs`;
      });
    infraCode += `return {
${outputItems.join(",\n")}
}`;

    return `
${globalImports}

export default (async () => {
${infraCode}
})();
`;
  }

  private generateInfraCode_Resource(resource: arch.Resource): string {
    const dotPos = resource.type.indexOf(".");
    const pkgName = dotPos == -1 ? "@plutolang/pluto" : resource.type.substring(0, dotPos);
    const typeName = dotPos == -1 ? resource.type : resource.type.substring(dotPos + 1);
    const parameterString = resource.arguments
      .map((arg) => arch.Argument.stringify(arg))
      .join(", ");
    return `
const ${resource.id} = await (
  await import("${pkgName}-infra")
).${typeName}.createInstance(${parameterString});
`;
  }

  private generateInfraCode_Closure(closure: arch.Closure, archRef: arch.Architecture): string {
    interface Dependency {
      readonly resourceId: string;
      readonly type: "method" | "property";
      readonly operation: string;
    }

    // This section identifies all dependencies of the closure, which fall into two categories:
    // 1. Resources whose properties the closure accesses. For these resources, we need to transfer
    //    the properties to the runtime environment via environment variables.
    // 2. Resources whose methods the closure calls. For these resources, we need to request
    //    permissions so that the closure can invoke these methods during runtime on the platform.
    const dependencies: Dependency[] = [];
    archRef.relationships.forEach((relat) => {
      if (relat.type === arch.RelationshipType.Infrastructure || relat.bundle.id !== closure.id) {
        return;
      }

      dependencies.push({
        resourceId: relat.resource.id,
        type: relat.type === arch.RelationshipType.Client ? "method" : "property",
        operation: relat.type === arch.RelationshipType.Client ? relat.operation : relat.property,
      });
    });

    // Construct the dependency items and concatenate them using a comma separator.
    const dependenciesString = dependencies
      .map(
        (dep) => `
{ 
  resourceObject: ${dep.resourceId}, 
  type: "${dep.type}", 
  operation: "${dep.operation}" 
}
`
      )
      .join(",");

    let exportName: string;
    switch (this.language) {
      case LanguageType.TypeScript:
        exportName = "default";
        break;
      case LanguageType.Python:
        exportName = "_default";
        break;
      default:
        throw new Error(`Unsupported language: ${this.language}`);
    }

    const dirpath = path.resolve(this.rootpath, closure.path);
    // We encapsulate the closure within a function because the statements in the closure's global
    // scope are executed upon import. However, these statements are likely intended to run on the
    // target platform, not during the deployment stage.
    return `
const ${closure.id}_func = async (...args: any[]) => {
  const handler = (await import("${dirpath}")).default;
  return await handler(...args);
}
const ${closure.id} = createClosure(${closure.id}_func, {
  dirpath: "${dirpath}",
  exportName: "${exportName}",
  dependencies: [${dependenciesString}],
  accessedEnvVars: [${closure.envVars.map((envVar) => `"${envVar}"`).join(", ")}],
});
`;
  }

  private generateInfraCode_Relationship(relationship: arch.Relationship): string {
    assert(
      relationship.type === arch.RelationshipType.Infrastructure,
      "Only infrastructure relationships are supported."
    );
    const parameterString = relationship.arguments
      .map((arg) => arch.Argument.stringify(arg))
      .join(", ");

    return `
${relationship.caller.id}.${relationship.operation}(${parameterString});
`;
  }
}

function compileTs(code: string): string {
  const result = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  if (result.diagnostics) {
    result.diagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start!
        );
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
      }
    });
  }
  return result.outputText;
}

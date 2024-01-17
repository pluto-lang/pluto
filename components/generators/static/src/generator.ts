import path from "path";
import * as ts from "typescript";
import { arch, core } from "@plutolang/base";
import { writeToFile } from "./utils";
import { TopoSorter } from "./topo-sorter";

// The name of the compiled entrypoint
const ENTRYPOINT_FILENAME = "pulumi";

export class StaticGenerator extends core.Generator {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(path.join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(path.join(__dirname, "../package.json")).version;

  constructor(args: core.BasicArgs) {
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
    const topoSort: TopoSorter = new TopoSorter(archRef);
    const entities = topoSort.topologySort();

    let globalImports = `import { createClosure } from "@plutolang/base/closure";`;
    let infraCode = ``;
    for (const entity of entities) {
      if (entity instanceof arch.Resource) {
        infraCode += this.generateInfraCode_Resource(entity);
      } else if (entity instanceof arch.Closure) {
        infraCode += this.generateInfraCode_Closure(entity, archRef);
      } else if (entity instanceof arch.Relationship) {
        infraCode += this.generateInfraCode_Relationship(entity);
      }
    }

    entities
      .filter((entity) => entity instanceof arch.Resource)
      .forEach((entity) => {
        const resource = entity as arch.Resource;
        infraCode += `${resource.id}.postProcess();\n`;
      });

    return `
${globalImports}

export default (async () => {
${infraCode}
})();
`;
  }

  private generateInfraCode_Resource(resource: arch.Resource): string {
    const dotPos = resource.type.lastIndexOf(".");
    const pkgName = dotPos == -1 ? "@plutolang/pluto" : resource.type.substring(0, dotPos);
    const typeName = dotPos == -1 ? resource.type : resource.type.substring(dotPos + 1);
    return `
const ${resource.id} = await (
  await import("${pkgName}-infra")
).${typeName}.createInstance(${resource.getParamString()});
`;
  }

  private generateInfraCode_Closure(closure: arch.Closure, archRef: arch.Architecture): string {
    interface Dependency {
      readonly resourceId: string;
      readonly type: "method" | "property";
      readonly operation: string;
    }

    const dependencies: Dependency[] = [];
    archRef.relationships
      .filter(
        (relat) =>
          relat.from.type === "closure" &&
          relat.from.id === closure.id &&
          relat.type !== arch.RelatType.Create
      )
      .forEach((relat) => {
        relat.to
          .filter((to) => to.type === "resource")
          .forEach((to) => {
            dependencies.push({
              resourceId: to.id,
              type: relat.type === arch.RelatType.MethodCall ? "method" : "property",
              operation: relat.operation,
            });
          });
      });

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

    const dirpath = path.resolve(this.rootpath, closure.path);
    return `
const ${closure.id}_func = (await import("${dirpath}")).default;
const ${closure.id} = createClosure(${closure.id}_func, {
  dirpath: "${dirpath}",
  dependencies: [${dependenciesString}],
});
`;
  }

  private generateInfraCode_Relationship(relationship: arch.Relationship): string {
    return `
${relationship.from.id}.${relationship.operation}(${relationship.getParamString()});
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

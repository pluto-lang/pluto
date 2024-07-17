import path from "path";
import { toFile } from "ts-graphviz/adapter";
import { arch, core } from "@plutolang/base";
import { writeToFile } from "./utils";

export class GraphvizGenerator extends core.Generator {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(path.join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(path.join(__dirname, "../package.json")).version;

  constructor(args: core.NewGeneratorArgs) {
    super(args);
  }

  public async generate(archRef: arch.Architecture, outdir: string): Promise<core.GenerateResult> {
    const dotText = archToGraphviz(archRef);
    const dotFile = path.join(outdir, "arch.dot");
    writeToFile("", dotFile, dotText);

    const svgFile = path.join(outdir, "arch.png");
    await toFile(dotText, svgFile, { format: "png" });
    return { entrypoint: svgFile };
  }
}

function archToGraphviz(archRef: arch.Architecture): string {
  let dotSource = "strict digraph {\n";
  for (const resName in archRef.resources) {
    const res = archRef.resources[resName];
    dotSource += `  ${res.id} [label="<<${res.type}>>\\n${res.name}"];\n`;

    for (const arg of res.arguments) {
      if (arg.type === "closure") {
        dotSource += `  ${res.id} -> ${arg.closureId} [color="black"];\n`;
      } else if (arg.type === "resource" || arg.type === "capturedProperty") {
        dotSource += `  ${res.id} -> ${arg.resourceId} [color="black"];\n`;
      }
    }
  }

  for (const relat of archRef.relationships) {
    switch (relat.type) {
      case arch.RelationshipType.Infrastructure: {
        const fromId = relat.caller.id;

        let label = relat.operation.toUpperCase();
        label +=
          " " + relat.arguments.map((a) => `${a.name}:${arch.Argument.stringify(a)}`).join(",");
        label = label.replace(/"/g, '\\"');

        relat.arguments.forEach((arg) => {
          if (arg.type === "closure") {
            dotSource += `  ${fromId} -> ${arg.closureId} [label="${label}",color="black"];\n`;
          } else if (arg.type === "resource" || arg.type === "capturedProperty") {
            dotSource += `  ${fromId} -> ${arg.resourceId} [label="${label}",color="black"];\n`;
          }
        });

        break;
      }
      case arch.RelationshipType.Client: {
        const label = relat.operation;
        dotSource += `  ${relat.bundle.id} -> ${relat.resource.id} [label="${label}",color="blue"];\n`;
        break;
      }
      case arch.RelationshipType.CapturedProperty: {
        const label = relat.property;
        dotSource += `  ${relat.bundle.id} -> ${relat.resource.id} [label="${label}",color="blue"];\n`;
        break;
      }
    }
  }
  dotSource += "}";
  return dotSource;
}

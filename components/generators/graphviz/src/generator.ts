import path from "path";
import { toFile } from "ts-graphviz/adapter";
import { arch, core } from "@plutolang/base";
import { writeToFile } from "./utils";

export class GraphvizGenerator extends core.Generator {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(path.join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(path.join(__dirname, "../package.json")).version;

  constructor(args: core.BasicArgs) {
    super(args);
  }

  public async generate(archRef: arch.Architecture, outdir: string): Promise<core.GenerateResult> {
    const dotText = archToGraphviz(archRef);
    const dotFile = path.join(outdir, "arch.dot");
    writeToFile("", dotFile, dotText);

    const svgFile = path.join(outdir, "arch.svg");
    await toFile(dotText, svgFile, { format: "svg" });
    return { entrypoint: svgFile };
  }
}

function archToGraphviz(archRef: arch.Architecture): string {
  let dotSource = "strict digraph {\n";
  for (const resName in archRef.resources) {
    const res = archRef.resources[resName];
    dotSource += `  ${res.name} [label="<<${res.type}>>\\n${res.name}"];\n`;
  }
  for (const relat of archRef.relationships) {
    let label =
      relat.type == arch.RelatType.CREATE ? relat.operation.toUpperCase() : relat.operation;
    const color = relat.type == arch.RelatType.CREATE ? "black" : "blue";
    label +=
      " " +
      relat.parameters
        .map((p) => `${p.name}:${p.value}`)
        .join(",")
        .replace(/"/g, '\\"');
    dotSource += `  ${relat.from.name} -> ${relat.to.name} [label="${label}",color="${color}"];\n`;
  }
  dotSource += "}";
  return dotSource;
}

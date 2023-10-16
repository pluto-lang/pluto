import { GenerateOptions, Generator, arch } from "@pluto/base";
import { writeToFile } from "./utils";

export class GraphvizGenerator implements Generator {
  public async generate(opts: GenerateOptions): Promise<void> {
    const dotText = archToGraphviz(opts.archRef);
    writeToFile("", opts.outdir + "/arch.dot", dotText);
  }
}

function archToGraphviz(archRef: arch.Architecture): string {
  let dotSource = "strict digraph {\n";
  for (let resName in archRef.resources) {
    const res = archRef.resources[resName];
    dotSource += `  ${res.name} [label="<<${res.type}>>\\n${res.name}"];\n`;
  }
  for (let relat of archRef.relationships) {
    let label =
      relat.type == arch.RelatType.CREATE ? relat.operation.toUpperCase() : relat.operation;
    let color = relat.type == arch.RelatType.CREATE ? "black" : "blue";
    label +=
      " " +
      relat.parameters
        .map((p) => `${p.name}\:${p.value}`)
        .join(",")
        .replace(/"/g, '\\"');
    dotSource += `  ${relat.from.name} -> ${relat.to.name} [label="${label}",color="${color}"];\n`;
  }
  dotSource += "}";
  return dotSource;
}

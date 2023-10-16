import * as fs from "fs";
import { GenerateOptions, Generator, arch } from "@pluto/base";
import { writeToFile } from "./utils";

export class StaticGenerator implements Generator {
  public async generate(opts: GenerateOptions): Promise<void> {
    const pirCode = genPirCode(opts.archRef);
    writeToFile(opts.outdir, "pir-pulumi.ts", pirCode);

    const cirCodes = genAllCirCode(opts.archRef);
    cirCodes.forEach((cir) => {
      const filename = `cir-${cir.resource.name}.ts`;
      writeToFile(opts.outdir, filename, cir.code);
    });
  }
}

export function genPirCode(archRef: arch.Architecture): string {
  let iacSource = `import { IRegistry, Registry } from "@pluto/pluto";

const RUNTIME_TYPE = process.env['RUNTIME_TYPE'] || "aws";
const reg: IRegistry = new Registry();


import { register as plutoRegister } from "@pluto/pluto/iac";
plutoRegister(reg);


let resDefCls = null;

`;

  // Resource definition, first for BaaS, second for FaaS
  for (let resName in archRef.resources) {
    const res = archRef.getResource(resName);
    if (res.type == "Root" || res.type == "Lambda") continue;

    iacSource += `resDefCls = reg.getResourceDef(RUNTIME_TYPE, '${res.type}');
const ${resName} = new resDefCls(${res.getParamString()});\n\n`;
  }

  // Specify the dependency of FaaS on this particular BaaS, because the building image process needs to be performed after exporting Dapr YAML.
  for (let resName in archRef.resources) {
    const res = archRef.getResource(resName);
    if (res.type != "Lambda") continue;

    const deps = [];
    for (let relat of archRef.relationships) {
      if (relat.from != res || relat.type != arch.RelatType.ACCESS) continue;
      deps.push(relat.to.name);
    }

    iacSource += `resDefCls = reg.getResourceDef(RUNTIME_TYPE, '${res.type}');
const ${resName} = new resDefCls(${res.getParamString()}, {}, { dependsOn: [${deps.join(
      ","
    )}] });\n\n`;
  }

  // Establish resource dependencies, including triggering and accessing.
  for (let relat of archRef.relationships) {
    if (relat.from.type == "Root") continue;

    if (relat.type == arch.RelatType.CREATE) {
      iacSource += `${relat.from.name}.${relat.operation}(${relat.getParamString()});\n`;
    } else if (relat.type == arch.RelatType.ACCESS) {
      iacSource += `${relat.from.name}.grantPermission("${relat.operation}", ${relat.to.name}.fuzzyArn());\n`;
    }
  }

  iacSource += "\n";
  for (let resName in archRef.resources) {
    const res = archRef.getResource(resName);
    if (res.type == "Root" || res.type == "Lambda") continue;
    iacSource += `${resName}.postProcess();\n`;
  }

  iacSource += `export const { url } = router;\n`;
  return iacSource;
}

interface ComputeIR {
  resource: arch.Resource;
  code: string;
}

function genAllCirCode(archRef: arch.Architecture): ComputeIR[] {
  const genCirCode = (res: arch.Resource): string => {
    let cirCode = `import { Event, Request, Router, Queue, State } from '@pluto/pluto';\n\n`;

    // Find the dependencies of this CIR and build corresponding instances.
    for (let relat of archRef.relationships) {
      if (relat.from != res) continue;
      // TODO: verify if the buildClient function exists. If it does not, use the original statement.
      cirCode += `const ${relat.to.name} = ${
        relat.to.type
      }.buildClient(${relat.to.getParamString()});\n`;
    }

    // TODO: Assuming there is only one loction now.
    res.locations.forEach((loc) => {
      const usercode = fs.readFileSync(loc.file, "utf-8");

      const lines = usercode.split("\n");
      const [startLine, startPos] = loc.linenum["start"].split("-").map((n) => Number(n));
      const [endLine, endPos] = loc.linenum["end"].split("-").map((n) => Number(n));

      for (let lineIdx = startLine; lineIdx <= endLine; lineIdx++) {
        const linecode = lines[lineIdx];
        let partcode = "";
        if (lineIdx == startLine) {
          partcode = `export default ` + linecode.slice(startPos);
        } else if (lineIdx == endLine) {
          partcode = linecode.substring(0, endPos);
        } else {
          partcode = linecode;
        }
        cirCode += partcode + "\n";
      }
    });
    return cirCode;
  };

  const cirs: ComputeIR[] = [];
  for (let resName in archRef.resources) {
    const res = archRef.getResource(resName);
    if (res.type != "Lambda") continue;
    cirs.push({ resource: res, code: genCirCode(res) });
  }
  return cirs;
}

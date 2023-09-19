import * as fs from "fs";
import { Architecture, parseArchFromYaml, RelatType, Resource } from "../../models";
import { writeToFile } from "../../utils";

const archFilepath = process.argv[2];
const outDirpath = process.argv[3];

export function genPirCode(arch: Architecture): string {
    let iacSource = `import { IRegistry, Registry } from "@pluto/pluto";

const RUNTIME_TYPE = process.env['RUNTIME_TYPE'] || "aws";
const reg: IRegistry = new Registry();


import { register as plutoRegister } from "@pluto/pluto/iac";
plutoRegister(reg);


let resDefCls = null;

`

    // Resource definition
    for (let resName in arch.resources) {
        const res = arch.getResource(resName);
        if (res.type == 'Root') continue;

        iacSource += `resDefCls = reg.getResourceDef(RUNTIME_TYPE, '${res.type}');
const ${resName} = new resDefCls(${res.getParamString()});\n\n`
    }

    // Establish resource dependencies, including triggering and accessing.
    for (let relat of arch.relationships) {
        if (relat.from.type == 'Root') continue;

        if (relat.type == RelatType.CREATE) {
            iacSource += `${relat.from.name}.${relat.operation}(${relat.getParamString()});\n`

        } else if (relat.type == RelatType.ACCESS) {
            iacSource += `${relat.from.name}.grantPermission("${relat.operation}", ${relat.to.name}.fuzzyArn());\n`;
        }
    }

    iacSource += '\n';
    for (let resName in arch.resources) {
        const res = arch.getResource(resName);
        if (res.type == 'Root' || res.type == 'Lambda') continue;
        iacSource += `${resName}.postProcess();\n`;
    }

    iacSource += `export const { url } = router;\n`;
    return iacSource;
}

interface ComputeIR {
    resource: Resource;
    code: string;
}

function genAllCirCode(arch: Architecture): ComputeIR[] {
    const genCirCode = (res: Resource): string => {
        let cirCode = `import { Event, Request, Router, Queue, State } from '@pluto/pluto';\n\n`;

        // Find the dependencies of this CIR and build corresponding instances.
        for (let relat of arch.relationships) {
            if (relat.from != res) continue;
            // TODO: verify if the buildClient function exists. If it does not, use the original statement.
            cirCode += `const ${relat.to.name} = ${relat.to.type}.buildClient(${relat.to.getParamString()});\n`
        }

        // TODO: Assuming there is only one loction now.
        res.locations.forEach((loc) => {
            const usercode = fs.readFileSync(loc.file, 'utf-8');

            const lines = usercode.split('\n');
            const [startLine, startPos] = loc.linenum['start'].split('-').map((n) => Number(n));
            const [endLine, endPos] = loc.linenum['end'].split('-').map((n) => Number(n));

            for (let lineIdx = startLine; lineIdx <= endLine; lineIdx++) {
                const linecode = lines[lineIdx];
                let partcode = '';
                if (lineIdx == startLine) {
                    partcode = `export default ` + linecode.slice(startPos);
                } else if (lineIdx == endLine) {
                    partcode = linecode.substring(0, endPos);
                } else {
                    partcode = linecode;
                }
                cirCode += partcode + '\n';
            }
        })
        return cirCode;
    }

    const cirs: ComputeIR[] = []
    for (let resName in arch.resources) {
        const res = arch.getResource(resName);
        if (res.type != 'Lambda') continue;
        cirs.push({ resource: res, code: genCirCode(res) });
    }
    return cirs;
}

const archSource = fs.readFileSync(archFilepath, 'utf-8');
const arch = parseArchFromYaml(archSource);
const pirCode = genPirCode(arch);
writeToFile(outDirpath, 'pir-pulumi.ts', pirCode);

const cirCodes = genAllCirCode(arch);
cirCodes.forEach((cir) => {
    const filename = `cir-${cir.resource.name}.ts`;
    writeToFile(outDirpath, filename, cir.code);
})
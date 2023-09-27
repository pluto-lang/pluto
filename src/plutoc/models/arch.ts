import { Parameter } from "./parameter";
import { RelatType, Relationship } from "./relationship";
import { Resource, Location } from "./resource";
import * as yaml from 'yaml';

export class Architecture {
    readonly resources: { [name: string]: Resource };
    readonly relationships: Relationship[];

    constructor() {
        this.resources = {};
        this.relationships = [];
    }

    public addResource(res: Resource) {
        if (res.name in this.resources) {
            throw new Error(`there is a resource with same name '${res.name}'`);
        }
        this.resources[res.name] = res;
    }

    public getResource(name: string): Resource {
        if (name in this.resources) {
            return this.resources[name];
        }
        throw new Error(`there is no resource with name '${name}'`);
    }

    public addRelationship(relat: Relationship) {
        this.relationships.push(relat);
    }

    public toYaml(): string {
        const resourceMap: { [name: string]: { [key: string]: any } } = {}
        for (let resName in this.resources) {
            const res = this.resources[resName];
            resourceMap[resName] = {
                type: res.type,
                locations: res.locations,
                parameters: res.parameters,
            }
        }

        const relatList: {}[] = []
        for (let relat of this.relationships) {
            const r = {
                from: relat.from.name,
                to: relat.to.name,
                type: relat.type,
                operation: relat.operation,
                parameters: relat.parameters,
            }
            relatList.push(r);
        }

        return yaml.stringify({ "resources": resourceMap, "relationships": relatList });
    }

    public toGraphviz(): string {
        let dotSource = 'strict digraph {\n';
        for (let resName in this.resources) {
            const res = this.resources[resName];
            dotSource += `  ${res.name} [label="<<${res.type}>>\\n${res.name}"];\n`;
        }
        for (let relat of this.relationships) {
            let label = relat.type == RelatType.CREATE ? relat.operation.toUpperCase() : relat.operation;
            let color = relat.type == RelatType.CREATE ? "black" : "blue";
            label += ' ' + relat.parameters.map((p) => `${p.name}\:${p.value}`).join(',').replace(/"/g, "\\\"");
            dotSource += `  ${relat.from.name} -> ${relat.to.name} [label="${label}",color="${color}"];\n`;
        }
        dotSource += '}';
        return dotSource;
    }
}

export function parseArchFromYaml(yamlSource: string): Architecture {
    const yamlObj = yaml.parseDocument(yamlSource);

    const arch = new Architecture();
    const resourceMap = yamlObj.get('resources') as yaml.YAMLMap;
    resourceMap.items.forEach((item) => {
        const resName = String(item.key);
        const res = parseResource(resName, item.value as yaml.YAMLMap);
        arch.addResource(res);
    })

    const relatSep = yamlObj.get('relationships') as yaml.YAMLSeq;
    relatSep.items.forEach((item) => {
        const relat = parseRelationship(arch, item as yaml.YAMLMap);
        arch.addRelationship(relat);
    })

    return arch;
}

function parseResource(name: string, yamlMap: yaml.YAMLMap): Resource {
    const type = yamlMap.get('type') as string;
    const locsYaml = yamlMap.get('locations') as yaml.YAMLSeq;
    const paramsYaml = yamlMap.get('parameters') as yaml.YAMLSeq;

    const locs = locsYaml.items.map((item): Location => {
        const locYaml = item as yaml.YAMLMap;

        const linenumYaml = locYaml.get('linenum') as yaml.YAMLMap;
        const linenum = { start: String(linenumYaml.get("start")), end: String(linenumYaml.get('end')) };

        return {
            file: String(locYaml.get('file')),
            linenum: linenum
        }
    })

    const params = paramsYaml.items.map((item): Parameter => {
        const paramYaml = item as yaml.YAMLMap;
        return {
            index: Number(paramYaml.get('index')),
            name: String(paramYaml.get('name')),
            value: String(paramYaml.get('value'))
        }
    })

    return new Resource(name, type, locs, params)
}

function parseRelationship(arch: Architecture, yamlMap: yaml.YAMLMap): Relationship {
    const fromName = String(yamlMap.get('from'));
    const toName = String(yamlMap.get('to'));
    const type = String(yamlMap.get('type'));
    const operation = String(yamlMap.get('operation'));
    const paramsYaml = yamlMap.get('parameters') as yaml.YAMLSeq;

    const params = paramsYaml.items.map((item): Parameter => {
        const paramYaml = item as yaml.YAMLMap;
        return {
            index: Number(paramYaml.get('index')),
            name: String(paramYaml.get('name')),
            value: String(paramYaml.get('value'))
        }
    })

    return new Relationship(
        arch.getResource(fromName),
        arch.getResource(toName),
        RelatType.CREATE == type ? RelatType.CREATE : RelatType.ACCESS,
        operation,
        params
    )
}
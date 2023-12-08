import * as ts from "typescript";
import * as path from "path";
import { arch, core } from "@plutolang/base";
import { genImportStats } from "./imports";
import { ResourceRelationshipInfo, ResourceVariableInfo } from "./types";
import { FN_RESOURCE_TYPE_NAME } from "./constants";
import { visitVariableStatement } from "./visit-var-def";
import { visitExpression } from "./visit-expression";

export class StaticDeducer extends core.Deducer {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(path.join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(path.join(__dirname, "../package.json")).version;

  constructor(args: core.BasicArgs) {
    super(args);
  }

  public async deduce(entrypoints: string[]): Promise<core.DeduceResult> {
    if (entrypoints.length == 0) {
      throw new Error("The entrypoints is empty.");
    }

    const tsconfigPath = path.resolve("./", "tsconfig.json");
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const configJson = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./");
    const archRef = await compile(entrypoints, configJson.options);
    return { archRef };
  }
}

async function compile(
  fileNames: string[],
  tsOpts: ts.CompilerOptions
): Promise<arch.Architecture> {
  const program = ts.createProgram(fileNames, tsOpts);
  const allDiagnostics = ts.getPreEmitDiagnostics(program);
  // Emit errors
  allDiagnostics.forEach((diagnostic) => {
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
  const sourceFile = program.getSourceFile(fileNames[0])!;
  const checker = program.getTypeChecker();

  const resVarInfos: ResourceVariableInfo[] = [];
  const resRelatInfos: ResourceRelationshipInfo[] = [];

  // Iterate through all the nodes in the global area.
  ts.forEachChild(sourceFile, (node) => {
    const kindName = ts.SyntaxKind[node.kind];
    switch (node.kind) {
      case ts.SyntaxKind.VariableStatement: {
        const curVarInfos = visitVariableStatement(node as ts.VariableStatement, checker);
        resVarInfos.push(...curVarInfos);
        break;
      }
      case ts.SyntaxKind.ExpressionStatement: {
        const union = visitExpression(node as ts.ExpressionStatement, checker);
        resVarInfos.push(...union.resourceVarInfos);
        resRelatInfos.push(...union.resourceRelatInfos);
        break;
      }
      case ts.SyntaxKind.ImportDeclaration:
      case ts.SyntaxKind.EndOfFileToken:
      case ts.SyntaxKind.FunctionDeclaration:
        break;
      default: {
        const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
        throw new Error(
          `${sourceFile.fileName} (${line + 1},${
            character + 1
          }): Sorry. Pluto doesn't currently support '${kindName}' in the global area. If you need this feature, please feel free to open an issue and let us know.`
        );
      }
    }
  });

  return buildArchRef(resVarInfos, resRelatInfos);
}

function buildArchRef(
  resVarInfos: ResourceVariableInfo[],
  resRelatInfos: ResourceRelationshipInfo[]
): arch.Architecture {
  const archResources: arch.Resource[] = resVarInfos.map((varInfo): arch.Resource => {
    const resName = varInfo.varName;
    const resType = varInfo.resourceConstructInfo.constructExpression;
    const resLocs = varInfo.resourceConstructInfo.locations.map((loc): arch.Location => {
      return {
        file: loc.file,
        depth: loc.depth,
        linenum: {
          start: loc.start.replace(",", "-").replace(/[()]/g, ""),
          end: loc.end.replace(",", "-").replace(/[()]/g, ""),
        },
      };
    });
    const resParams =
      varInfo.resourceConstructInfo.parameters?.map((param, idx): arch.Parameter => {
        return {
          index: idx,
          name: "unknown",
          value: param.getText(),
        };
      }) ?? [];
    if (resType == FN_RESOURCE_TYPE_NAME) {
      resParams?.push({ name: "name", index: 0, value: `"${resName}"` });
    }

    const res = new arch.Resource(resName, resType, resLocs, resParams);
    const imports = genImportStats(varInfo.resourceConstructInfo.importElements);
    res.addImports(...imports);
    return res;
  });

  const hasFather = new Set<string>();
  const archRelats: arch.Relationship[] = resRelatInfos.map((relatInfo): arch.Relationship => {
    if (relatInfo.type == arch.RelatType.CREATE) {
      relatInfo.toVarNames.forEach((name) => hasFather.add(name));
    }

    const fromRes = archResources.find((val) => val.name == relatInfo.fromVarName)!;
    const toRes = archResources.find((val) => val.name == relatInfo.toVarNames[0])!;
    const relatType = relatInfo.type;
    const relatOp = relatInfo.operation;
    const params = relatInfo.parameters.map((param): arch.Parameter => {
      return {
        index: param.order,
        name: param.name,
        value: param.resourceName ?? param.expression.getText(),
      };
    });
    return new arch.Relationship(fromRes, toRes, relatType, relatOp, params);
  });

  const root = new arch.Resource("App", "Root"); // Resource Root
  archResources
    .filter((res) => !hasFather.has(res.name))
    .forEach((res) => {
      const relat = new arch.Relationship(root, res, arch.RelatType.CREATE, "new");
      archRelats.push(relat);
    });

  const archRef = new arch.Architecture();
  archRef.addResource(root);
  archResources.forEach((res) => archRef.addResource(res));
  archRelats.forEach((relat) => archRef.addRelationship(relat));
  return archRef;
}

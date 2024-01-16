import ts from "typescript";
import path from "path";
import assert from "assert";
import { arch, core, utils } from "@plutolang/base";
import { ResourceRelationshipInfo, ResourceVariableInfo } from "./types";
import { FN_RESOURCE_TYPE_NAME } from "./constants";
import { visitVariableStatement } from "./visit-var-def";
import { visitExpression } from "./visit-expression";
import { DependentResource, Location, writeClosureToDir } from "./closure";
import { genImportStats } from "./imports";

interface Context {
  readonly projectName: string;
  readonly stackName: string;
  readonly rootpath: string;
  readonly closureBaseDir: string;
}

export class StaticDeducer extends core.Deducer {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly name = require(path.join(__dirname, "../package.json")).name;
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  public readonly version = require(path.join(__dirname, "../package.json")).version;

  private readonly closureDir: string;

  constructor(args: core.NewDeducerArgs) {
    super(args);
    this.closureDir = args.closureDir;
  }

  public async deduce(entrypoints: string[]): Promise<core.DeduceResult> {
    if (entrypoints.length == 0) {
      throw new Error("The entrypoints is empty.");
    }

    const tsconfigPath = path.resolve("./", "tsconfig.json");
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const configJson = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./");
    const archRef = await compile(entrypoints, configJson.options, {
      projectName: this.project,
      stackName: this.stack.name,
      rootpath: this.rootpath,
      closureBaseDir: this.closureDir,
    });
    return { archRef };
  }
}

async function compile(
  fileNames: string[],
  tsOpts: ts.CompilerOptions,
  ctx: Context
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

  // Find all closures, and write them into the closure directory.
  storeAllClosure(resVarInfos, resRelatInfos, ctx);

  return buildArchRef(resVarInfos, resRelatInfos, ctx);
}

function storeAllClosure(
  resVarInfos: ResourceVariableInfo[],
  resRelatInfos: ResourceRelationshipInfo[],
  ctx: Context
) {
  resVarInfos.forEach((varInfo) => {
    if (varInfo.resourceConstructInfo.constructExpression !== FN_RESOURCE_TYPE_NAME) {
      return;
    }

    const clousureName = varInfo.varName;
    const imports = genImportStats(varInfo.resourceConstructInfo.importElements).join("\n");

    const locations: Location[] = varInfo.resourceConstructInfo.locations.map((loc) => {
      return {
        file: loc.file,
        depth: loc.depth,
        linenum: {
          start: loc.start.replace(",", "-").replace(/[()]/g, ""),
          end: loc.end.replace(",", "-").replace(/[()]/g, ""),
        },
      };
    });

    const dependentResources: DependentResource[] = [];
    resRelatInfos
      .filter((relatInfo) => relatInfo.fromVarName === clousureName)
      .forEach((relatInfo) => {
        resVarInfos
          .filter((varInfo) => relatInfo.toVarNames.includes(varInfo.varName))
          .forEach((varInfo) => {
            dependentResources.push({
              imports: genImportStats(varInfo.resourceConstructInfo.importElements).join("\n"),
              name: varInfo.varName,
              type: varInfo.resourceConstructInfo.constructExpression,
              parameters:
                varInfo.resourceConstructInfo.parameters
                  ?.map((param) => param.getText())
                  .join("\n") ?? "",
            });
          });
      });

    const dirpath = path.resolve(ctx.closureBaseDir, varInfo.varName);
    writeClosureToDir(imports, locations, dependentResources, dirpath);
  });
}

function buildArchRef(
  resVarInfos: ResourceVariableInfo[],
  resRelatInfos: ResourceRelationshipInfo[],
  ctx: Context
): arch.Architecture {
  const archClosures: arch.Closure[] = [];
  const archResources: arch.Resource[] = [];
  resVarInfos.forEach((varInfo) => {
    const resName = varInfo.varName;
    const resType = varInfo.resourceConstructInfo.constructExpression;
    if (resType === FN_RESOURCE_TYPE_NAME) {
      // Closure
      const dirpath = path
        .resolve(ctx.closureBaseDir, resName)
        .replace(new RegExp(`^${ctx.rootpath}\/?`), "");
      archClosures.push(new arch.Closure(resName, dirpath));
    } else {
      // Resource
      const resParams =
        varInfo.resourceConstructInfo.parameters?.map((param, idx): arch.Parameter => {
          return {
            index: idx,
            name: "unknown",
            type: resType === FN_RESOURCE_TYPE_NAME ? "closure" : "text",
            value: param.getText(),
          };
        }) ?? [];

      const resId = utils.genResourceId(ctx.projectName, ctx.stackName, resType, resName);
      const res = new arch.Resource(resId, resName, resType, resParams);
      archResources.push(res);
    }
  });

  const archRelats: arch.Relationship[] = resRelatInfos.map((relatInfo): arch.Relationship => {
    const fromRes =
      archResources.find((val) => val.name == relatInfo.fromVarName) ??
      archClosures.find((val) => val.id == relatInfo.fromVarName);
    const toRes =
      archResources.find((val) => val.name == relatInfo.toVarNames[0]) ??
      archClosures.find((val) => val.id == relatInfo.toVarNames[0]);
    assert(fromRes !== undefined && toRes !== undefined);

    const fromType = fromRes instanceof arch.Closure ? "closure" : "resource";
    const toType = toRes instanceof arch.Closure ? "closure" : "resource";

    const relatType = relatInfo.type;
    const relatOp = relatInfo.operation;
    const params = relatInfo.parameters.map((param): arch.Parameter => {
      return {
        index: param.order,
        name: param.name,
        type: toRes instanceof arch.Closure ? "closure" : "text",
        value: param.resourceName ?? param.expression.getText(),
      };
    });
    return new arch.Relationship(
      { id: fromRes.id, type: fromType },
      [{ id: toRes.id, type: toType }],
      relatType,
      relatOp,
      params
    );
  });

  const archRef = new arch.Architecture();
  archResources.forEach((res) => archRef.addResource(res));
  archClosures.forEach((closure) => archRef.addClosure(closure));
  archRelats.forEach((relat) => archRef.addRelationship(relat));
  return archRef;
}

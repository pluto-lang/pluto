import ts from "typescript";
import path from "path";
import assert from "assert";
import { arch, core, utils } from "@plutolang/base";
import {
  ParameterInfo,
  ResourceRelationshipInfo,
  ResourceVariableInfo,
  VisitResult,
  concatVisitResult,
} from "./types";
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

  let visitResult: VisitResult = {
    resourceRelatInfos: [],
    resourceVarInfos: [],
  };

  // Iterate through all the nodes in the global area.
  ts.forEachChild(sourceFile, (node) => {
    const kindName = ts.SyntaxKind[node.kind];
    switch (node.kind) {
      case ts.SyntaxKind.VariableStatement: {
        const result = visitVariableStatement(node as ts.VariableStatement, checker);
        visitResult = concatVisitResult(visitResult, result);
        break;
      }
      case ts.SyntaxKind.ExpressionStatement: {
        const result = visitExpression(node as ts.ExpressionStatement, checker);
        visitResult = concatVisitResult(visitResult, result);
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
  storeAllClosure(visitResult.resourceVarInfos!, visitResult.resourceRelatInfos!, ctx);

  return buildArchRef(visitResult.resourceVarInfos!, visitResult.resourceRelatInfos!, ctx);
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

    const closureName = varInfo.varName;
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

    // Find all relationships that this closure is the source. Then find all resources that this
    // relationship directs to. These resources are the dependent resources.
    const dependentResources: DependentResource[] = [];
    resRelatInfos
      .filter((relatInfo) => relatInfo.fromVarName === closureName)
      .forEach((relatInfo) => {
        resVarInfos
          .filter((varInfo) => relatInfo.toVarNames.includes(varInfo.varName)) // Find the dependent resources.
          .forEach((varInfo) => {
            // Extract the imports, name, type, and parameters of the dependent resource.
            dependentResources.push({
              imports: genImportStats(varInfo.resourceConstructInfo.importElements).join("\n"),
              name: varInfo.varName,
              type: varInfo.resourceConstructInfo.constructExpression,
              parameters:
                varInfo.resourceConstructInfo.parameters
                  ?.map((param) => {
                    if (param.type === "closure") {
                      // If the parameter is a closure, we use the any type to fill.
                      return "({} as any)";
                    }

                    if (param.type === "property") {
                      return `${param.resourceVarName}.${param.property}()`;
                    }

                    return param.expression?.getText() ?? "undefined";
                  })
                  .join(", ") ?? "",
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
  function getResourceNameByVarName(varName: string): string {
    const resVarInfo = resVarInfos.find((val) => val.varName === varName);
    assert(resVarInfo !== undefined, `'${varName}' is not found.`);
    return resVarInfo.resourceName ?? varName;
  }

  function constructArchParameter(param: ParameterInfo): arch.Argument {
    switch (param.type) {
      case "closure":
        return arch.ClosureArgument.create(param.order, param.name, param.closureName);
      case "property": {
        const resName = getResourceNameByVarName(param.resourceVarName);
        const res = archResources.find((r) => r.name === resName);
        assert(res !== undefined);
        return arch.CapturedPropertyArgument.create(
          param.order,
          param.name,
          res.id,
          param.property
        );
      }
      case "text":
        return arch.TextArgument.create(
          param.order,
          param.name,
          param.expression?.getText() ?? "undefined"
        );
    }
  }

  const archClosures: arch.Closure[] = [];
  const archResources: arch.Resource[] = [];
  resVarInfos.forEach((varInfo) => {
    let resName;
    const resType = varInfo.resourceConstructInfo.constructExpression;
    if (resType === FN_RESOURCE_TYPE_NAME) {
      // Closure
      resName = varInfo.varName;
      const dirpath = path
        .resolve(ctx.closureBaseDir, resName)
        .replace(new RegExp(`^${ctx.rootpath}/?`), "");
      archClosures.push(new arch.Closure(resName, dirpath));
    } else {
      // Resource
      resName = varInfo.resourceName;
      assert(resName !== undefined, `The resource name ${resName} is not defined.`);

      const resParams = varInfo.resourceConstructInfo.parameters?.map(constructArchParameter) ?? [];

      // TODO: remove this temporary solution, fetch full quilified name of the resource type from
      // the user code.
      const tmpResType = "@plutolang/pluto." + resType;
      const resId = utils.genResourceId(ctx.projectName, ctx.stackName, tmpResType, resName);
      const res = arch.Resource.create(resId, resName, tmpResType, resParams);
      archResources.push(res);
    }
  });

  const archRelats: arch.Relationship[] = resRelatInfos.map((relatInfo): arch.Relationship => {
    switch (relatInfo.type) {
      case arch.RelationshipType.Infrastructure: {
        const callerResource = archResources.find(
          (val) => val.name == getResourceNameByVarName(relatInfo.fromVarName)
        );
        assert(callerResource !== undefined);

        const relatOp = relatInfo.operation;
        const args = relatInfo.parameters.map(constructArchParameter);
        return arch.InfraRelationship.create(callerResource, relatOp, args);
      }
      case arch.RelationshipType.Client: {
        const bundle = archClosures.find((val) => val.id == relatInfo.fromVarName);
        assert(bundle !== undefined);

        assert(
          relatInfo.toVarNames.length == 1,
          "Client relationship should have only one target."
        );
        const res = archResources.find(
          (val) => val.name == getResourceNameByVarName(relatInfo.toVarNames[0])
        );
        assert(res !== undefined);

        return arch.ClientRelationship.create(bundle, res, relatInfo.operation);
      }
      case arch.RelationshipType.CapturedProperty: {
        const bundle = archClosures.find((val) => val.id == relatInfo.fromVarName);
        assert(bundle !== undefined);

        assert(
          relatInfo.toVarNames.length == 1,
          "Captured property relationship should have only one target."
        );
        const res = archResources.find(
          (val) => val.name == getResourceNameByVarName(relatInfo.toVarNames[0])
        );
        assert(res !== undefined);

        return arch.CapturedPropertyRelationship.create(bundle, res, relatInfo.operation);
      }
    }
  });

  const archRef = new arch.Architecture();
  archResources.forEach((res) => archRef.addResource(res));
  archClosures.forEach((closure) => archRef.addClosure(closure));
  archRelats.forEach((relat) => archRef.addRelationship(relat));
  return archRef;
}

import * as ts from "typescript";
import * as path from "path";
import { assert } from "console";
import { DeduceOptions, Deducer, arch } from "@plutolang/base";
import {
  ImportElement,
  ImportStore,
  ImportType,
  extractImportElements,
  genImportStats,
} from "./imports";
import { resolveImportDeps } from "./dep-resolve";

const CloudResourceType = ["Router", "Queue", "KVStore", "Schedule"];

const RESOUCE_TYPE_NAME = "Resource";
const FN_RESOURCE_TYPE_NAME = "FnResource";
const PLUTO_BASE_PKG = "@plutolang/base";

export class StaticDeducer implements Deducer {
  public async deduce(opts: DeduceOptions): Promise<arch.Architecture> {
    const { filepaths } = opts;
    if (filepaths.length == 0) {
      throw new Error("The filepaths is empty.");
    }

    const tsconfigPath = path.resolve("./", "tsconfig.json");
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const configJson = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./");
    // return await compilePluto(filepaths, configJson.options);
    return compile(filepaths, configJson.options);
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

  ts.forEachChild(sourceFile, (node) => {
    const text = node.getText(sourceFile);
    const kindName = ts.SyntaxKind[node.kind];
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
        break;
      case ts.SyntaxKind.VariableStatement:
        const resVarInfos = visitVariableStatement(node as ts.VariableStatement, checker);
        break;
      case ts.SyntaxKind.ExpressionStatement:
        visitExpression(node as ts.ExpressionStatement, checker);
        break;
      default:
        const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
        throw new Error(
          `${sourceFile.fileName} (${line + 1},${
            character + 1
          }): Sorry. Pluto doesn't currently support '${kindName}' in the global area. If you need this feature, please feel free to open an issue and let us know.`
        );
    }
    // console.log("@@ ", ts.SyntaxKind[node.kind], text);
  });

  return await compilePluto(fileNames, tsOpts);
}

interface ResourceVariableInfo {
  varName: string;
  resourceConstructInfo: ResourceConstructInfo;
}

/**
 * Check if this variable declaration is defining a resource. If it is,
 * retrieve the name of the variable and its construction details.
 */
export function visitVariableStatement(
  parNode: ts.VariableStatement,
  checker: ts.TypeChecker
): ResourceVariableInfo[] {
  if (process.env.DEBUG) {
    console.log(`Visit a VariableStatement: `, parNode.getText());
  }

  const resVarInfos = parNode.declarationList.declarations.map(
    (declaration): ResourceVariableInfo | undefined => {
      if (declaration.initializer == undefined) {
        // This is a variable declaration without initial value.
        // e.g. let x;
        return;
      }

      if (ts.isNewExpression(declaration.initializer)) {
        // This is a constructor call. May resource initialization.
        // e.g. new MyClass()
        const resConstInfo = visitNewExpression(declaration.initializer, checker);
        if (resConstInfo == undefined) {
          return;
        }

        const varName = declaration.name;
        if (!ts.isIdentifier(varName)) {
          console.warn("Found a variable name that is not an identifier: ", varName.getText());
          return;
        }
        return {
          varName: varName.text,
          resourceConstructInfo: resConstInfo,
        };
      }
      return;
    }
  );
  return resVarInfos.filter((v) => v !== undefined) as ResourceVariableInfo[];
}

/**
 * Check if this expression is doing something about resource, including:
 *   1. Create a new resource and assign it to a variable.
 *   2. Invoke a resource method.
 */
export function visitExpression(
  parNode: ts.ExpressionStatement,
  checker: ts.TypeChecker
): ResourceVariableInfo[] {
  if (process.env.DEBUG) {
    console.log(`Visit an ExpressionStatement: `, parNode.getText());
  }

  const childNode = parNode.expression;
  if (ts.isBinaryExpression(childNode)) {
    visitBinaryExpression(childNode, checker);
  }

  if (ts.isCallExpression(childNode)) {
    visitCallExpression(childNode, checker);
  }

  // TODO: for case 2

  return [];
}

export function visitCallExpression(parNode: ts.CallExpression, checker: ts.TypeChecker): void {
  if (process.env.DEBUG) {
    console.log(`Visit a CallExpression: `, parNode.getText());
  }

  const type = checker.getTypeAtLocation(parNode.expression);
  if (!isFunctionType(type)) {
    return;
  }

  const fnResources = [];
  const createParams = []; // parameters in relationship of arch ref

  const signature = checker.getResolvedSignature(parNode);
  if (signature == undefined) {
    console.log("Cannot get resolved signature: " + parNode.getText());
    return;
  }

  const args = parNode.arguments;
  signature.parameters.forEach((param, idx) => {
    const paramName = param.name;

    const paramText = args[idx].getText();
    const relatParams = { name: paramName, order: idx, text: paramText, resource: "" };

    const paramType = checker.getTypeOfSymbol(param);
    const decls = paramType.symbol?.declarations;
    if (
      decls != undefined &&
      decls.length >= 1 &&
      (ts.isInterfaceDeclaration(decls[0]) || ts.isClassDeclaration(decls[0])) &&
      isResourceType(decls[0], checker, true)
    ) {
      // This is a FnResource.
      if (decls.length != 1) {
        console.warn("Found a parameter with more than one declarations: " + parNode.getText());
      }

      console.log("is fn resource");
      // TODO: create a lambda resource.

      // const resConstInfo = visitFnResourceParameter(args[idx], checker);
      console.log(ts.SyntaxKind[args[idx].kind]);

      relatParams.text = "";
      relatParams.resource = "/todo";
      createParams.push(relatParams);
      return;
    }

    createParams.push(relatParams);
    return;
  });
}

/**
 * Check if a type is function.
 */
function isFunctionType(type: ts.Type): boolean {
  const flags =
    ts.TypeFlags.Any |
    ts.TypeFlags.Unknown |
    ts.TypeFlags.Void |
    ts.TypeFlags.Undefined |
    ts.TypeFlags.Null |
    ts.TypeFlags.Never |
    ts.TypeFlags.Intersection |
    ts.TypeFlags.Union |
    ts.TypeFlags.Index;
  return type.getCallSignatures().length > 0 && (type.getFlags() & flags) === 0;
}

/**
 * Recursively visit the binary expression.
 */
export function visitBinaryExpression(
  parNode: ts.BinaryExpression,
  checker: ts.TypeChecker
): ResourceVariableInfo[] {
  if (process.env.DEBUG) {
    console.log(`Visit a BinaryExpression: `, parNode.getText());
  }

  const resVarInfos: ResourceVariableInfo[] = [];
  // Check if this is an assignment expression.
  // e.g. x = new MyClass();
  if (parNode.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const resVarInfo = visitAssignmentExpression(parNode, checker);
    if (resVarInfo != undefined) {
      resVarInfos.push(resVarInfo);
    }
    return resVarInfos;
  }

  if (parNode.operatorToken.kind !== ts.SyntaxKind.CommaToken) {
    console.warn("The operator token is not '=' or ',', please check if the result is valid.");
  }

  const leftNode = parNode.left;
  const rightNode = parNode.right;
  if (ts.isBinaryExpression(leftNode)) {
    resVarInfos.push(...visitBinaryExpression(leftNode, checker));
  }
  if (ts.isBinaryExpression(rightNode)) {
    resVarInfos.push(...visitBinaryExpression(rightNode, checker));
  }
  return resVarInfos;
}

/**
 * This is a binary expression with a '=' token. It may be assigning a resource to a variable.
 */
export function visitAssignmentExpression(
  parNode: ts.BinaryExpression,
  checker: ts.TypeChecker
): ResourceVariableInfo | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit a visitAssignmentExpression: `, parNode.getText());
  }
  if (!ts.isNewExpression(parNode.right)) {
    return;
  }

  const resConstInfo = visitNewExpression(parNode.right, checker);
  if (resConstInfo == undefined) {
    return;
  }
  const varName = parNode.left.getText();
  return {
    varName: varName,
    resourceConstructInfo: resConstInfo,
  };
}

interface ResourceConstructInfo {
  // The expression that constructs the resource.
  constructExpression: string;
  // The information of the package from which the resource type is imported.
  importElement: ImportElement;
  // The constructor parameters.
  parameters?: ts.Expression[];
}

/**
 * Check this NewExpression is trying to construct a resource.
 * If it is, retrieve the resoruce construction information.
 */
function visitNewExpression(
  parNode: ts.NewExpression,
  checker: ts.TypeChecker
): ResourceConstructInfo | undefined {
  if (process.env.DEBUG) {
    console.log(`Visit a NewExpression: `, parNode.getText());
  }

  const type = checker.getTypeAtLocation(parNode);
  // const type = checker.getTypeAtLocation(parNode);
  if (type.symbol == undefined) {
    console.warn(
      "The constructor type in this NewExpression does not have a symbol: ",
      parNode.getText()
    );
    return;
  }
  const clsDecl = type.symbol.valueDeclaration;
  if (clsDecl == undefined) {
    console.warn(
      "The symbol of constructor type in this NewExpression does not have a declaration: ",
      parNode.getText()
    );
    return;
  }
  if (!ts.isClassDeclaration(clsDecl)) {
    console.warn("The constructor does not belong to a class declaration: ", clsDecl.getText());
    return;
  }

  if (!isResourceType(clsDecl, checker)) {
    return;
  }

  // Analyze the import dependencies of the source file for the current node.
  // We will use this analysis result to get the import information of current resource.
  const importStore = new ImportStore();
  const sourceFile = parNode.getSourceFile();
  const importStats = sourceFile.statements
    .filter(ts.isImportDeclaration)
    .flatMap((stmt) => extractImportElements(sourceFile, stmt));
  importStore.update(importStats);

  const constructExpression = parNode.expression.getText();
  const elemName = constructExpression.split(".")[0];
  const importElement = importStore.searchElement(elemName);
  if (importElement == undefined) {
    throw new Error(
      `Cannot find the import element: ${elemName}, NewExpression: ${parNode.getText()}`
    );
  }
  return {
    constructExpression: constructExpression,
    importElement: importElement,
    parameters: parNode.arguments?.map((v) => v),
  };
}

// export function visitFnResourceParameter(
//   parNode: ts.Expression,
//   checker: ts.TypeChecker
// ): ResourceConstructInfo {
//   if (process.env.DEBUG) {
//     console.log(`Visit a ParameterDeclaration: `, parNode.getText());
//   }

// }

/**
 * Check if the declaration implements or extends the Resource interaface.
 * First, analyze the import dependencies of the source file for the current type node.
 * Then, check if the base types of this declaration are from the Resource interface in the plutolang base package.
 * If not, recursively check each base type.
 */
export function isResourceType(
  declNode: ts.ClassDeclaration | ts.InterfaceDeclaration,
  checker: ts.TypeChecker,
  fnResource: boolean = false
): boolean {
  const targetTypeName = fnResource ? FN_RESOURCE_TYPE_NAME : RESOUCE_TYPE_NAME;

  // Analyze the import dependencies of the source file for the current type node.
  // If the type node implements the Resource interface, we can use this analysis result to
  // verify if the Resource interface belongs to plutolang.
  const importStore = new ImportStore();
  const sourceFile = declNode.getSourceFile();
  const importStats = sourceFile.statements
    .filter(ts.isImportDeclaration)
    .flatMap((stmt) => extractImportElements(sourceFile, stmt));
  importStore.update(importStats);

  let found = false;
  declNode.heritageClauses?.forEach((clause) => {
    if (found) {
      return;
    }

    // Check every type in the implementation and extension clauses.
    for (const typeNode of clause.types) {
      const identifier = typeNode.expression;
      if (identifier.getText() == targetTypeName) {
        const elem = importStore.searchElement(targetTypeName);
        if (elem?.package == PLUTO_BASE_PKG) {
          found = true;
          return;
        }
      }

      // Obtain the declaration of the base type. Then, proceed to recursively verify
      // if it implements or extends the Resource interface.
      const symbol = checker.getSymbolAtLocation(identifier);
      if (symbol == undefined || symbol.declarations == undefined) {
        continue;
      }
      for (const decl of symbol.declarations) {
        if (!ts.isClassDeclaration(decl) && !ts.isInterfaceDeclaration(decl)) {
          continue;
        }
        if (isResourceType(decl, checker, fnResource)) {
          found = true;
          return;
        }
      }
    }
  });
  return found;
}

async function compilePluto(
  fileNames: string[],
  options: ts.CompilerOptions
): Promise<arch.Architecture> {
  const archRef = new arch.Architecture();
  const root = new arch.Resource("App", "Root"); // Resource Root
  archRef.addResource(root);

  const program = ts.createProgram(fileNames, options);
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
  // To print the AST, we'll use TypeScript's printer
  let handlerIndex = 1;

  const importStore: ImportStore = new ImportStore();
  // Loop through the root AST nodes of the file
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      importStore.update(extractImportElements(sourceFile, node));

      if (!node.importClause || !node.importClause.namedBindings) {
        return;
      }
      if (!ts.isNamedImports(node.importClause.namedBindings)) {
        return;
      }

      node.importClause.namedBindings.elements.forEach((elem) => {
        const elemName = elem.name.getText();

        const symbol = checker.getSymbolAtLocation(elem.getChildAt(0));
        if (!symbol) return;
        const ty = checker.getTypeOfSymbol(symbol);

        console.log("--------- ONE IMPORT ELEMENT ----------");
        console.log("# Element Name: ", elemName);
        console.log("# Symbol Name: ", symbol.getName());
        console.log("# Type Name: ", checker.typeToString(ty));

        // const signatures = ty.getConstructSignatures();
        // console.log(ty.getBaseTypes()?.map((ty) => ty.symbol.getName()));
        // console.log(signatures.length, ty.isClassOrInterface());
        // signatures.forEach((signature) => {
        //   signature.parameters.forEach((param) => {
        //     console.log(param.getName());
        //   });
        // });
      });

      return;
    }

    // VariableStatement: Maybe IaC Definition
    if (ts.isVariableStatement(node)) {
      if (
        node.declarationList.declarations[0].initializer &&
        ts.isNewExpression(node.declarationList.declarations[0].initializer)
      ) {
        // TODO: declarations.forEach()
        const newExpr = node.declarationList.declarations[0].initializer;
        const variable = node.declarationList.declarations[0].name;
        const varName = variable.getText(sourceFile);
        const symbol = checker.getSymbolAtLocation(newExpr.expression);
        // TODO: use `ts.factory.createIdentifier("factorial")` to replace.
        if (symbol) {
          // TODO: use decorator mapping on SDK? The SDK auto workflow
          const ty = checker.getTypeOfSymbol(symbol);
          const resType = ty.symbol.escapedName.toString();
          const param1 = newExpr.arguments![0].getText();
          if (process.env.DEBUG) {
            console.log(`Found a ${resType}: ${varName}`);
          }

          // Get the dependency of this class
          const initFn = newExpr.expression.getText(sourceFile);
          const elemName = initFn.split(".")[0];
          const elem = importStore.searchElement(elemName);
          if (elem == undefined) {
            throw new Error(`Cannot find the element for ${elemName}`);
          }

          const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
          const loc: arch.Location = {
            file: fileNames[0],
            linenum: {
              start: `${startPos.line}-${startPos.character}`,
              end: `${endPos.line}-${endPos.character}`,
            },
          };
          const param: arch.Parameter = { index: 0, name: "name", value: param1 };
          const newRes = new arch.Resource(varName, resType, [loc], [param]);
          // TODO: get additional dependencies in the parameters.
          newRes.addImports(...genImportStats([elem]));
          const relat = new arch.Relationship(root, newRes, arch.RelatType.CREATE, "new");
          archRef.addResource(newRes);
          archRef.addRelationship(relat);
        }
      }
    }
    // ExpressionStatement: Maybe FaaS router handler
    // lookup `router.get()` form
    if (
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      ts.isPropertyAccessExpression(node.expression.expression)
    ) {
      const symbol = checker.getSymbolAtLocation(node.expression.expression.expression);
      if (symbol) {
        const ty = checker.getTypeOfSymbol(symbol);

        console.log("--------- ONE OBJECT ----------");
        console.log("# Symbol Name: ", symbol.getName());
        console.log("# Type Name: ", checker.typeToString(ty));

        const ty2 = checker.getTypeOfSymbol(ty.symbol);

        // Error: Got the interface, instead of Class
        console.log(ty.getBaseTypes()?.map((ty) => ty.symbol.getName()));
        const signatures = ty.getConstructSignatures();
        console.log(signatures.length);
        signatures.forEach((signature) => {
          signature.parameters.forEach((param) => {
            console.log(param.getName());
          });
        });

        const className = ty.symbol.escapedName.toString();
        // TODO: use router Type
        if (["Router", "Queue", "Schedule"].indexOf(className) !== -1) {
          const objName = symbol.escapedName;
          const op = node.expression.expression.name.getText();

          // Check each argument and create a Lambda resource if the argument is a function.
          const iacArgs: arch.Parameter[] = [];
          const resources = [];
          for (let argIdx = 0; argIdx < node.expression.arguments.length; argIdx++) {
            const arg = node.expression.arguments[argIdx];
            if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
              const fnName = `lambda${handlerIndex}`;
              const resType = "FnResource";
              if (process.env.DEBUG) {
                console.log("Found a FnResource: " + fnName);
              }

              const startPos = sourceFile.getLineAndCharacterOfPosition(arg.getStart(sourceFile));
              const endPos = sourceFile.getLineAndCharacterOfPosition(arg.getEnd());
              const loc: arch.Location = {
                file: fileNames[0],
                linenum: {
                  start: `${startPos.line}-${startPos.character}`,
                  end: `${endPos.line}-${endPos.character}`,
                },
              };
              const param: arch.Parameter = {
                index: 0,
                name: "name",
                value: `"lambda${handlerIndex}"`,
              };
              const newRes = new arch.Resource(fnName, resType, [loc], [param]);
              archRef.addResource(newRes);
              resources.push(newRes);

              // Constructs the import statments of this function
              const deps: ImportElement[] = resolveImportDeps(sourceFile, importStore, arg);
              const importStats = genImportStats(deps);
              if (process.env.DEBUG) {
                console.log(`Generate ${importStats.length} import statments: `);
                console.log(importStats.join("\n"));
              }
              newRes.addImports(...importStats);

              detectPermission(archRef, fnName, arg, checker);

              // TODO: get the parameter name
              iacArgs.push({ index: argIdx, name: "fn", value: fnName });
              handlerIndex++;
            } else {
              iacArgs.push({ index: argIdx, name: "path", value: arg.getText() });
            }
          }

          if (resources.length > 0) {
            const parRes = archRef.getResource(objName.toString());
            resources.forEach((res) => {
              const relat = new arch.Relationship(parRes, res, arch.RelatType.CREATE, op, iacArgs);
              archRef.addRelationship(relat);
            });
          }
        }
      }
    }
  });

  // Add direct import statment to Root
  const elems = importStore.listAllElementsByType(ImportType.Direct);
  root.addImports(...genImportStats(elems));
  return archRef;
}

function detectPermission(
  archRef: arch.Architecture,
  fnName: string,
  fnNode: ts.Expression,
  tyChecker: ts.TypeChecker
) {
  const checkPermission = (node: ts.Node) => {
    let propAccessExp;
    // Write operation, e.g. state.set(), queue.push()
    if (
      ts.isExpressionStatement(node) &&
      ts.isAwaitExpression(node.expression) &&
      ts.isCallExpression(node.expression.expression) &&
      ts.isPropertyAccessExpression(node.expression.expression.expression)
    ) {
      propAccessExp = node.expression.expression.expression;
    } else if (ts.isVariableStatement(node)) {
      // Read operation, e.g. state.get()
      const initExp = node.declarationList.declarations[0].initializer;
      if (
        initExp &&
        ts.isAwaitExpression(initExp) &&
        ts.isCallExpression(initExp.expression) &&
        ts.isPropertyAccessExpression(initExp.expression.expression)
      ) {
        propAccessExp = initExp.expression.expression;
      }
    }

    // fetch permission
    if (propAccessExp) {
      const objSymbol = tyChecker.getSymbolAtLocation(propAccessExp.expression);
      if (!objSymbol) {
        return;
      }

      const typ = tyChecker.getTypeOfSymbol(objSymbol);
      if (CloudResourceType.indexOf(typ.symbol.escapedName.toString()) == -1) {
        return;
      }
      const opSymbol = tyChecker.getSymbolAtLocation(propAccessExp);
      assert(opSymbol, "Op Symbol is undefined");

      const resName = objSymbol!.escapedName.toString();
      const opName = opSymbol!.escapedName.toString();

      const fromRes = archRef.getResource(fnName);
      const toRes = archRef.getResource(resName);
      const relat = new arch.Relationship(fromRes, toRes, arch.RelatType.ACCESS, opName);
      archRef.addRelationship(relat);
    }
  };

  const fnBody = fnNode.getChildAt(fnNode.getChildCount() - 1);
  fnBody.forEachChild(checkPermission);
}

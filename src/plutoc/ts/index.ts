import * as ts from "typescript";
import * as path from "path";
import { assert } from "console";

import { Location, Resource, Architecture, RelatType, Parameter, Relationship } from "../models";
import { writeToFile } from "../utils";

const outputDir = process.argv[2] || '_output'

const CloudResourceType = ['Router', 'Queue', 'State']

const arch = new Architecture();
const root = new Resource('App', 'Root');  // Resource Root
arch.addResource(root);

function compilePluto(fileNames: string[], options: ts.CompilerOptions): void {
    if (fileNames.length == 0) {
        return;
    }

    let daprStateSource = ``
    let daprQueueSource = ``

    let program = ts.createProgram(fileNames, options);
    let allDiagnostics = ts.getPreEmitDiagnostics(program)
    // Emit errors
    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });
    const sourceFile = program.getSourceFile(fileNames[0])!;
    let checker = program.getTypeChecker();
    // To print the AST, we'll use TypeScript's printer
    let hasIaC = false;
    let handlerIndex = 1;
    let stateStoreIndex = 1;
    let queueIndex = 1;

    // Loop through the root AST nodes of the file
    ts.forEachChild(sourceFile, node => {
        // VariableStatement: Maybe IaC Definition
        if (ts.isVariableStatement(node)) {
            if (node.declarationList.declarations[0].initializer && ts.isNewExpression(node.declarationList.declarations[0].initializer)) {
                // TODO: declarations.forEach()
                let newExpr = node.declarationList.declarations[0].initializer;
                let variable = node.declarationList.declarations[0].name;
                const name = variable.getText(sourceFile)
                let symbol = checker.getSymbolAtLocation(newExpr.expression)
                // TODO: use `ts.factory.createIdentifier("factorial")` to replace.
                if (symbol) {
                    // TODO: use decorator mapping on SDK? The SDK auto workflow
                    let ty = checker.getTypeOfSymbol(symbol)
                    let resType = ty.symbol.escapedName.toString();
                    const param1 = newExpr.arguments![0].getText()


                    const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                    const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
                    const loc: Location = {
                        file: "main.ts",
                        linenum: {
                            start: `${startPos.line}-${startPos.character}`,
                            end: `${endPos.line}-${endPos.character}`
                        }
                    };
                    const param: Parameter = { index: 0, name: 'name', value: param1 }
                    const newRes = new Resource(name, resType, [loc], [param]);
                    const relat = new Relationship(root, newRes, RelatType.CREATE, "new")
                    arch.addResource(newRes);
                    arch.addRelationship(relat);

                    if (ty.symbol.escapedName == "State") {
                        // iacSource = iacSource + node.getText(sourceFile).replace("State", "iac.aws.DynamoDBDef") + "\n"
                        hasIaC = true;
                        let stateName = newExpr.arguments?.[0].getText() || `statestore${stateStoreIndex}`
                        stateStoreIndex += 1
                        daprStateSource = `
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ${stateName}
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: ${stateName}
  - name: partitionKey
    value: "Id" # Optional       
`
                    } else if (ty.symbol.escapedName == "Router") {
                        hasIaC = true;

                    } else if (ty.symbol.escapedName == "Queue") {
                        hasIaC = true;

                        let queueName = newExpr.arguments?.[0].getText() || `queue${queueIndex}`
                        queueIndex += 1
                        daprQueueSource = `
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ${queueName}
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
  - name: accessKey
    value: AKIA32AGWPFWBBQ2AKFW
  - name: secretKey
    value: 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
  - name: region
    value: us-east-1
`
                    }
                }
            }
        }
        // ExpressionStatement: Maybe FaaS router handler
        // lookup `router.get()` form
        if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && ts.isPropertyAccessExpression(node.expression.expression)) {
            let symbol = checker.getSymbolAtLocation(node.expression.expression.expression)
            if (symbol) {
                let ty = checker.getTypeOfSymbol(symbol)
                // TODO: use router Type
                if (["Router", "Queue"].indexOf(ty.symbol.escapedName.toString()) !== -1) {
                    let objName = symbol.escapedName
                    const op = node.expression.expression.name.getText()

                    // Check each argument and create a Lambda resource if the argument is a function.
                    const iacArgs: Parameter[] = []
                    const resources = []
                    for (let argIdx = 0; argIdx < node.expression.arguments.length; argIdx++) {
                        const arg = node.expression.arguments[argIdx];
                        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
                            const fnName = `fn${handlerIndex}`
                            const resType = 'Lambda';

                            const startPos = sourceFile.getLineAndCharacterOfPosition(arg.getStart(sourceFile));
                            const endPos = sourceFile.getLineAndCharacterOfPosition(arg.getEnd());
                            const loc: Location = {
                                file: fileNames[0],
                                linenum: {
                                    start: `${startPos.line}-${startPos.character}`,
                                    end: `${endPos.line}-${endPos.character}`
                                }
                            };
                            const param: Parameter = { index: 0, name: "name", value: `"cir-fn${handlerIndex}"` }
                            const newRes = new Resource(fnName, resType, [loc], [param]);
                            arch.addResource(newRes);
                            resources.push(newRes);

                            detectPermission(fnName, arg, checker);

                            // TODO: get the parameter name
                            iacArgs.push({ index: argIdx, name: 'fn', value: fnName })
                            handlerIndex++;

                        } else {
                            iacArgs.push({ index: argIdx, name: 'path', value: arg.getText() })
                        }
                    }

                    if (resources.length > 0) {
                        const parRes = arch.getResource(objName.toString());
                        resources.forEach((res) => {
                            const relat = new Relationship(parRes, res, RelatType.CREATE, op, iacArgs);
                            arch.addRelationship(relat);
                        })
                    }
                }
            }
        }
    });

    if (stateStoreIndex > 1) {
        // console.log(`State Source \n`, stateStoreSource)
        writeToFile(outputDir, `dapr/statestore.yaml`, daprStateSource);
    }

    if (queueIndex > 1) {
        // console.log(`Queue Source \n`, queueSource)
        writeToFile(outputDir, `dapr/pubsub.yaml`, daprQueueSource);
    }
}

function detectPermission(fnName: string, fnNode: ts.Expression, tyChecker: ts.TypeChecker) {
    const checkPermission = (node: ts.Node) => {
        let propAccessExp;
        // Write operation, e.g. state.set(), queue.push()
        if (ts.isExpressionStatement(node) && ts.isAwaitExpression(node.expression) &&
            ts.isCallExpression(node.expression.expression) && ts.isPropertyAccessExpression(node.expression.expression.expression)) {
            propAccessExp = node.expression.expression.expression;

        } else if (ts.isVariableStatement(node)) { // Read operation, e.g. state.get()
            const initExp = node.declarationList.declarations[0].initializer
            if (initExp && ts.isAwaitExpression(initExp) && ts.isCallExpression(initExp.expression) && ts.isPropertyAccessExpression(initExp.expression.expression)) {
                propAccessExp = initExp.expression.expression;
            }
        }

        // fetch permission
        if (propAccessExp) {
            let objSymbol = tyChecker.getSymbolAtLocation(propAccessExp.expression);
            let typ = tyChecker.getTypeOfSymbol(objSymbol!);
            if (CloudResourceType.indexOf(typ.symbol.escapedName.toString()) == -1) {
                return;
            }
            let opSymbol = tyChecker.getSymbolAtLocation(propAccessExp);
            assert(opSymbol, 'Op Symbol is undefined');

            const resName = objSymbol!.escapedName.toString();
            const opName = opSymbol!.escapedName.toString();

            const fromRes = arch.getResource(fnName);
            const toRes = arch.getResource(resName);
            const relat = new Relationship(fromRes, toRes, RelatType.ACCESS, opName)
            arch.addRelationship(relat);
        }
    }

    const fnBody = fnNode.getChildAt(fnNode.getChildCount() - 1)
    fnBody.forEachChild(checkPermission);
}

const tsconfigPath = path.resolve('./', 'tsconfig.json');
const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
const configJson = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');
compilePluto(process.argv.slice(3), configJson.options);

const yamlSource = arch.toYaml();
writeToFile(outputDir, "arch.yaml", yamlSource);
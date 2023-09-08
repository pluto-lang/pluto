import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

const emitSkipped = true;
const handlerFuncNamePrefix = "anonymous-handler-"
const mainFile = "main.ts"
const iacFile = "pulumi.ts"
const target = "AWS"
const outputDir = process.argv[2] || '_output'

function compilePluto(fileNames: string[], options: ts.CompilerOptions): void {
    if (fileNames.length == 0) {
        return;
    }
    let iacSource = `import { iac } from "@pluto";\n`
    let postIacSource = ''
    let iacDepSource = ``
    let stateStoreSource = ``
    let queueSource = ``
    let program = ts.createProgram(fileNames, options);
    let allDiagnostics = ts.getPreEmitDiagnostics(program)
    let handlerSources: string[] = [];
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
    let exitCode = 0;
    const sourceFile = program.getSourceFile(fileNames[0])!;
    let checker = program.getTypeChecker();
    // To print the AST, we'll use TypeScript's printer
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    let hasIaC = false;
    let handlerIndex = 1;
    let stateStoreIndex = 1;
    let queueIndex = 1;

    const resGroup: { [key: string]: string[] } = {}

    // Loop through the root AST nodes of the file
    ts.forEachChild(sourceFile, node => {
        let name = "";

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
                    if (ty.symbol.escapedName == "State") {
                        if (!('State' in resGroup)) {
                            resGroup['State'] = []
                        }
                        resGroup['State'].push(name)

                        iacSource = iacSource + node.getText(sourceFile).replace("State", "iac.aws.DynamoDBDef") + "\n"
                        hasIaC = true;
                        let stateName = newExpr.arguments?.[0].getText() || `statestore${stateStoreIndex}`
                        stateStoreIndex += 1
                        stateStoreSource = `
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
                        iacSource = iacSource + node.getText(sourceFile).replace("Router", "iac.aws.ApiGatewayDef") + "\n"
                        postIacSource += `${name}.postProcess()\n`;
                        postIacSource += `export const { url } = ${name}\n`;
                        hasIaC = true;
                    
                    } else if (ty.symbol.escapedName == "Queue") {
                        if (!('Queue' in resGroup)) {
                            resGroup['Queue'] = []
                        }
                        resGroup['Queue'].push(name)

                        iacSource = iacSource + node.getText(sourceFile).replace("Queue", "iac.aws.SNSDef") + "\n"
                        postIacSource += `${name}.postProcess()\n`;
                        hasIaC = true;

                        let queueName = newExpr.arguments?.[0].getText() || `queue${queueIndex}`
                        queueIndex += 1
                        queueSource = `
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
                    // Deal Handler
                    console.log("Deal Handler")
                    let handlerSource = iacDepSource + node.getText(sourceFile) + "\n"
                    handlerSources.push(handlerSource)
                    let objName = symbol.escapedName

                    let paramsText = '{}'
                    if (ty.symbol.escapedName == 'Router') {
                        paramsText = `{ path: ${node.expression.arguments[0].getText()} }`
                    }

                    // TODO: read-write set ana, and fetch host name
                    let lambdaSource = `const fn${handlerIndex} = new iac.aws.LambdaDef("anonymous-handler-${handlerIndex}");\n`
                    for (let resType in resGroup) {
                        // TODO: get operations and resources from the body of handler
                        resGroup[resType].forEach((resName) => {
                            if (resType == 'State') {
                                lambdaSource += `fn${handlerIndex}.grantPermission("set", ${resName}.fuzzyArn());\n`
                                lambdaSource += `fn${handlerIndex}.grantPermission("get", ${resName}.fuzzyArn());\n`
                            } else if (resType == 'Queue') {
                                lambdaSource += `fn${handlerIndex}.grantPermission("push", ${resName}.fuzzyArn());\n`
                            }
                        })
                    }
                    lambdaSource += `${objName}.addHandler("${node.expression.expression.name.getText()}", fn${handlerIndex}, ${paramsText})\n`;
                    iacSource += lambdaSource + "\n"
                    handlerIndex += 1
                }
            }
        } else {
            iacDepSource = iacDepSource + node.getText() + "\n"
        }
    });

    if (emitSkipped) {
        exitCode = 0
    }
    // console.log(`IaC Source \n`, iacSource)
    writeToFile('pulumi.ts', iacSource + postIacSource);
    
    handlerSources.forEach((h, i) => {
        // console.log(`Handler Source ${i + 1} \n`, h)
        writeToFile(`${handlerFuncNamePrefix}${i + 1}.ts`, h);
    })
    
    if (stateStoreIndex > 1) {
        // console.log(`State Source \n`, stateStoreSource)
        writeToFile(`dapr/statestore.yaml`, stateStoreSource);
    }

    if (queueIndex > 1) {
        // console.log(`Queue Source \n`, queueSource)
        writeToFile(`dapr/pubsub.yaml`, queueSource);
    }
    
    console.log(`Process exiting with code '${exitCode}'.`);
    process.exit(exitCode);
}

function writeToFile(filename: string, content: string) {
    // Ensure the directory exists
    const dirpath = path.join(outputDir, filename.substring(0, filename.lastIndexOf('/')));
    fs.mkdirSync(dirpath, { recursive: true });

    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, content);
}

compilePluto(process.argv.slice(3), {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    paths: {
        "@pluto": ["./pluto"],
    },
    esModuleInterop: true,
});

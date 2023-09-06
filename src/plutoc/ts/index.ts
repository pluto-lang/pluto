import * as ts from "typescript";

const emitSkipped = true;
const handlerFuncNamePrefix = "anonymous-handler-"
const mainFile = "main.ts"
const iacFile = "pulumi.ts"
const target = "AWS"

function compilePluto(fileNames: string[], options: ts.CompilerOptions): void {
    if (fileNames.length == 0) {
        return;
    }
    let iacSource = `import { iac } from "@pluto";\n`
    let iacDepSource = ``
    let stateStoreSource = ``
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

    // Loop through the root AST nodes of the file
    ts.forEachChild(sourceFile, node => {
        let name = "";

        // VariableStatement: Maybe IaC Definition
        if (ts.isVariableStatement(node)) {
            if (node.declarationList.declarations[0].initializer && ts.isNewExpression(node.declarationList.declarations[0].initializer)) {
                let newExpr = node.declarationList.declarations[0].initializer;
                let symbol = checker.getSymbolAtLocation(newExpr.expression)
                // TODO: use `ts.factory.createIdentifier("factorial")` to replace.
                if (symbol) {
                    // TODO: use decorator mapping on SDK? The SDK auto workflow
                    let ty = checker.getTypeOfSymbol(symbol)
                    if (ty.symbol.escapedName == "State") {
                        iacSource = iacSource + node.getText(sourceFile).replace("State", "iac.aws.DynamoDBDef") + "\n"
                        hasIaC = true;
                        let stateName = newExpr.arguments?.[0].getText() || `statestore${stateStoreIndex}`
                        stateStoreIndex += 1
                        stateStoreSource = `
link: State
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
                        hasIaC = true;
                    }
                }
            }
        }
        // ExpressionStatement: Maybe FaaS router handler
        if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && ts.isPropertyAccessExpression(node.expression.expression)) {
            let symbol = checker.getSymbolAtLocation(node.expression.expression.expression)
            if (symbol) {
                let ty = checker.getTypeOfSymbol(symbol)
                if (ty.symbol.escapedName == "Router") {
                    // Deal Handler
                    console.log("Deal Handler")
                    let handlerSource = iacDepSource + node.getText(sourceFile) + "\n"
                    handlerSources.push(handlerSource)

                    // TODO: read-write set ana
                    let lambdaSource = `const fn${handlerIndex} = new iac.aws.LambdaDef("anonymous-handler-${handlerIndex}");\n`
                    lambdaSource += `fn${handlerIndex}.grantPermission("set", state.fuzzyArn());\n`
                    lambdaSource += `fn${handlerIndex}.grantPermission("get", state.fuzzyArn());\n`
                    lambdaSource += `router.addHandler(${node.expression.expression.name.getText()}, fn${handlerIndex}, { path: ${node.expression.arguments[0].getText()} })\n`;
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
    console.log(`IaC Source \n`, iacSource)
    handlerSources.forEach((h, i) => {
        console.log(`Handler Source ${i + 1} \n`, h)
    })
    console.log(`State Source \n`, stateStoreSource)
    console.log(`Process exiting with code '${exitCode}'.`);
    process.exit(exitCode);
}

compilePluto(process.argv.slice(2), {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    paths: {
        "@pluto": ["./pluto"],
    },
    esModuleInterop: true,
});

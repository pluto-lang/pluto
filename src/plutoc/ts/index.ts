import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { assert } from "console";

const emitSkipped = true;
const handlerFuncNamePrefix = "anonymous-handler-"
const mainFile = "main.ts"
const iacFile = "pulumi.ts"
const target = "AWS"
const outputDir = process.argv[2] || '_output'

const CloudResourceType = ['Router', 'Queue', 'State']

class Resource {
    id: string;
    type: string;
    constructInfo: string;

    parent: Resource | null;
    children: Resource[];

    constructor(id: string, type: string, parent: Resource | null, constructInfo: string = "") {
        this.id = id;
        this.type = type;
        this.constructInfo = constructInfo;

        this.parent = parent;
        this.children = [];
    }
}

const root = new Resource("App", "Root", null);  // Resource Tree
const edges: any[][] = []  // Resource Access Relationship

const nodeMapping: { [id: string]: Resource } = {}
nodeMapping[root.id] = root;

function addNode(parId: string, nd: Resource) {
    if (!(parId in nodeMapping)) {
        throw new Error(`cannot find this node '${parId}'`);
    }
    const par = nodeMapping[parId];
    nd.parent = par;

    par.children.push(nd);
    nodeMapping[nd.id] = nd;
}

function addEdge(fromId: string, toId: string, op: string) {
    assert(fromId in nodeMapping && toId in nodeMapping, 'resource not in mapping');
    const from = nodeMapping[fromId];
    const to = nodeMapping[toId];
    edges.push([from, to, op]);
}

function printNode(nd: Resource) {
    for (let child of nd.children) {
        console.log(`${nd.type}(${nd.id}) - ${child.constructInfo} -> ${child.type}(${child.id})`)
    }
    for (let child of nd.children) {
        printNode(child);
    }
}

function printEdge(edges: any[][]) {
    for (let edge of edges) {
        const from = edge[0];
        const to = edge[1];
        const op = edge[2];
        console.log(`${from.type}(${from.id}) - ${op} -> ${to.type}(${to.id})`)
    }
}

function outputDot(root: Resource, edges: any[][]): string {
    const getResAlias = (res: Resource) => {
        return res.id;
    }
    let dotSource = 'strict digraph {\n';

    const que: Resource[] = []
    que.push(root);
    while (que.length > 0) {
        const curNode = que.pop()!;

        let partSource = `  ${getResAlias(curNode)} [label="<<${curNode.type}>>\\n${curNode.id}"];\n`;
        for (let child of curNode.children) {
            partSource += `  ${getResAlias(curNode)} -> ${getResAlias(child)} [label="${child.constructInfo.toUpperCase()}"];\n`;
            que.push(child);
        }

        // if (curNode.parent == root) {
        //     partSource = `  subgraph cluster_${clusterIdx} {\n    style=filled;\n    color=lightgrey;\n` + partSource + '  }\n'
        //     clusterIdx++;
        // }
        dotSource += partSource + '\n';
    }

    for (let edge of edges) {
        const from = edge[0];
        const to = edge[1];
        const op = edge[2];
        dotSource += `  ${getResAlias(from)} -> ${getResAlias(to)} [label="${op}", color=blue];\n`;
    }

    dotSource += '}';
    return dotSource
}


function compilePluto(fileNames: string[], options: ts.CompilerOptions): void {
    if (fileNames.length == 0) {
        return;
    }
    let iacSource = `import { iac, IRegistry, Registry } from "@pluto";

const RUNTIME_TYPE = process.env['RUNTIME_TYPE'] || "aws";
const reg: IRegistry = new Registry();


import { register as plutoRegister } from "@pluto";
plutoRegister(reg);


let resDefCls = null;

`
    let postIacSource = ''
    let iacDepSource = `import { IRegistry, Registry } from "@pluto";
const reg: IRegistry = new Registry();

const RUNTIME_TYPE = process.env['RUNTIME_TYPE'] || "";
if(RUNTIME_TYPE == "") throw new Error('cannot find env "RUNTIME_TYPE".')


import { register as plutoRegister } from "@pluto";
plutoRegister(reg);


let resDef = null;

`
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
                    let resType = ty.symbol.escapedName.toString();

                    let resDefSource = `resDefCls = reg.getResourceDef(RUNTIME_TYPE, '${resType}');\n`
                    resDefSource += `const ${name} = new resDefCls(${newExpr.arguments![0].getText()});\n\n`
                    iacSource += resDefSource;

                    let resCliSource = `resDef = reg.getResourceDef(RUNTIME_TYPE, '${resType}');\n`
                    resCliSource += `const ${name} = resDef.buildClient(${newExpr.arguments![0].getText()});\n\n`
                    iacDepSource += resCliSource;

                    addNode(root.id, new Resource(name, resType, null, "new"));
                    
                    if (ty.symbol.escapedName == "State") {
                        // iacSource = iacSource + node.getText(sourceFile).replace("State", "iac.aws.DynamoDBDef") + "\n"
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
                        postIacSource += `${name}.postProcess()\n`;
                        postIacSource += `export const { url } = ${name}\n`;
                        hasIaC = true;

                    } else if (ty.symbol.escapedName == "Queue") {
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
                console.log(symbol.escapedName.toString())
                let ty = checker.getTypeOfSymbol(symbol)
                // TODO: use router Type
                if (["Router", "Queue"].indexOf(ty.symbol.escapedName.toString()) !== -1) {
                    let objName = symbol.escapedName
                    const op = node.expression.expression.name.getText()

                    let lambdaSource = ``;
                    const iacArgs = []
                    for (let arg of node.expression.arguments) {
                        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
                            const fnName = `fn${handlerIndex}`
                            const resType = 'Lambda';

                            addNode(objName.toString(), new Resource(fnName, 'Lambda', null, op));

                            let handlerSource = 'export default ' + arg.getText(sourceFile) + "\n";
                            handlerSources.push(iacDepSource + handlerSource);

                            lambdaSource += `resDefCls = reg.getResourceDef(RUNTIME_TYPE, '${resType}');\n`
                            lambdaSource += `const ${fnName} = new resDefCls("anonymous-handler-${handlerIndex}");\n`
                            lambdaSource += detectPermission(fnName, arg, checker);

                            iacArgs.push(fnName);
                            handlerIndex ++;
                        
                        } else {
                            iacArgs.push(arg.getText())
                        }
                    }

                    lambdaSource += `${objName}.${op}(${iacArgs.join(', ')});\n`
                    iacSource += lambdaSource + "\n"
                }
            }
        } else if (ts.isImportDeclaration(node)) {
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

    // console.log(`Process exiting with code '${exitCode}'.`);
    // process.exit(exitCode);
}

function detectPermission(fnName: string, fnNode: ts.Expression, tyChecker: ts.TypeChecker): string {
    let permSource = ''
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
            permSource += `${fnName}.grantPermission("${opName}", ${resName}.fuzzyArn());\n`

            addEdge(fnName, resName, opName)
        }
    }

    const fnBody = fnNode.getChildAt(fnNode.getChildCount() - 1)
    fnBody.forEachChild(checkPermission);
    return permSource;
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

// printNode(root);
// printEdge(edges);

const dotSource = outputDot(root, edges);
writeToFile("graph.dot", dotSource);
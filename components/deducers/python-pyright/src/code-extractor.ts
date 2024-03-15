import assert from "node:assert";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import {
  ArgumentNode,
  CallNode,
  ClassNode,
  ExpressionNode,
  FunctionNode,
  ImportAsNode,
  ImportFromAsNode,
  LambdaNode,
  MemberAccessNode,
  NameNode,
  ParseNode,
  ParseNodeType,
} from "pyright-internal/dist/parser/parseNodes";
import { Scope } from "pyright-internal/dist/analyzer/scope";
import { DeclarationType } from "pyright-internal/dist/analyzer/declaration";
import { ParseTreeWalker, getChildNodes } from "pyright-internal/dist/analyzer/parseTreeWalker";
import * as AnalyzerNodeInfo from "pyright-internal/dist/analyzer/analyzerNodeInfo";
import { getBuiltInScope, getScopeForNode } from "pyright-internal/dist/analyzer/scopeUtils";
import * as TextUtils from "./text-utils";
import * as TypeUtils from "./type-utils";
import * as TypeConsts from "./type-consts";
import * as ScopeUtils from "./scope-utils";
import { SpecialNodeMap } from "./special-node-map";
import { Value, ValueEvaluator } from "./value-evaluator";

export interface CodeSegment {
  readonly node: ParseNode;
  /**
   * If a code segment hasn't an exportable name, it means the segment is not a direct exportable
   * expression, such as a lambda function or a function call. If we want to export the code
   * segment, we need to assign it to a variable, and then export the variable.
   */
  readonly exportableName?: string;
  /**
   * The code after being transformed from a node expression, including constant folding, etc. It
   * contains only one code segment related to the `node`, such as a variable assignment, a function
   * call, a class definition, etc. And it dependencies are specified in the `dependencies`.
   */
  readonly code: string;
  /**
   * The `dependencies` includes the variables, functions, classes, etc., that are accessed in the
   * current node.
   */
  readonly dependencies: CodeSegment[];
  /**
   * The client API calls that are used in the current node.
   */
  readonly calledClientApis?: CallNode[];
  /**
   * The captured properties that are accessed in the current node.
   */
  readonly accessedCapturedProps?: CallNode[];
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CodeSegment {
  export function toString(segment: CodeSegment): string {
    const extractedNodeIds: Set<number> = new Set();
    function concatCodeRecursively(segment: CodeSegment): string {
      const depsCode = segment.dependencies.map((dep) => concatCodeRecursively(dep)).join("\n");

      if (extractedNodeIds.has(segment.node.id)) {
        // Avoid extracting the same node multiple times.
        return depsCode;
      }

      extractedNodeIds.add(segment.node.id);
      return `${depsCode}\n${segment.code}`;
    }

    return concatCodeRecursively(segment);
  }

  export function getCalledClientApis(segment: CodeSegment): CallNode[] {
    const clientApiCalls: Set<CallNode> = new Set();
    function getCalledClientApisRecursively(segment: CodeSegment) {
      if (segment.calledClientApis) {
        segment.calledClientApis.forEach((callNode) => clientApiCalls.add(callNode));
      }
      segment.dependencies.forEach(getCalledClientApisRecursively);
    }
    getCalledClientApisRecursively(segment);
    return Array.from(clientApiCalls);
  }

  export function getAccessedCapturedProperties(segment: CodeSegment): CallNode[] {
    const capturedProperties: Set<CallNode> = new Set();
    function getAccessedCapturedPropertiesRecursively(segment: CodeSegment) {
      if (segment.accessedCapturedProps) {
        segment.accessedCapturedProps.forEach((callNode) => capturedProperties.add(callNode));
      }
      segment.dependencies.forEach(getAccessedCapturedPropertiesRecursively);
    }
    getAccessedCapturedPropertiesRecursively(segment);
    return Array.from(capturedProperties);
  }
}

/**
 * Extract the code and its dependencies of one expression.
 */
export class CodeExtractor {
  private readonly accessedSpecialNodeFinder: AccessedSpecialNodeFinder;
  constructor(
    private readonly typeEvaluator: TypeEvaluator,
    private readonly specialNodeMap: SpecialNodeMap<CallNode>,
    private readonly valueEvaluator: ValueEvaluator
  ) {
    this.accessedSpecialNodeFinder = new AccessedSpecialNodeFinder(specialNodeMap);
  }

  /**
   * Extract the code and its dependencies of one expression, such as a variable, a function call,
   * etc.
   * @param node - The expression node.
   * @param sourceFile - The source file where the expression node is located.
   */
  public extractExpressionWithDependencies(
    node: ExpressionNode,
    sourceFile: SourceFile
  ): CodeSegment {
    let segment: CodeSegment | undefined;
    switch (node.nodeType) {
      case ParseNodeType.Lambda:
        segment = this.extractLambdaWithDependencies(node, sourceFile);
        break;
      case ParseNodeType.Name:
        segment = this.extractNameNodeWithDependencies(node, sourceFile);
        break;
      case ParseNodeType.Call:
        segment = this.extractCallWithDependencies(node, sourceFile);
        break;
      case ParseNodeType.MemberAccess:
        segment = this.extractMemberAccessWithDependencies(node, sourceFile);
        break;
      case ParseNodeType.Number:
      case ParseNodeType.StringList:
        segment = {
          node,
          code: TextUtils.getTextOfNode(node, sourceFile)!,
          dependencies: [],
        };
        break;
      default:
        throw new Error(`Unsupported node type: ${node.nodeType}`);
    }
    return segment;
  }

  private extractLambdaWithDependencies(
    lambdaNode: LambdaNode,
    sourceFile: SourceFile
  ): CodeSegment {
    const nodeText = TextUtils.getTextOfNode(lambdaNode, sourceFile);

    const lambdaScope = getScopeForNode(lambdaNode.expression);
    if (!lambdaScope) {
      throw new Error(`No scope found for this lambda function '${nodeText}'.`);
    }

    // Find the symbols that are used in the lambda function but defined outside of it.
    const walker = new OutsideSymbolFinder(this.typeEvaluator, lambdaScope);
    walker.walk(lambdaNode);

    // Get the dependencies of the lambda function.
    const dependencies: CodeSegment[] = [];
    for (const nameNode of walker.nameNodes) {
      const dep = this.extractNameNodeWithDependencies(nameNode, sourceFile);
      dependencies.push(dep);
    }

    return {
      node: lambdaNode,
      code: nodeText!,
      dependencies,
      calledClientApis: this.accessedSpecialNodeFinder.findClientApiCalls(lambdaNode),
      accessedCapturedProps: this.accessedSpecialNodeFinder.findCapturedProperties(lambdaNode),
    };
  }

  /**
   * The name node can represent various types of nodes, like variables, functions, classes, etc.
   * When dealing with the name node, we extract what it refers to — the declaration — rather than the
   * node itself, and return the code segment for that declaration. Therefore, the function's return
   * value is the code segment of the declaration associated with the name node.
   */
  private extractNameNodeWithDependencies(nameNode: NameNode, sourceFile: SourceFile): CodeSegment {
    const lookUpResult = this.typeEvaluator.lookUpSymbolRecursive(nameNode, nameNode.value, false);
    if (!lookUpResult) {
      throw new Error(`No symbol found for node '${nameNode.value}'.`);
    }

    // Find the declaration of the symbol.
    const symbol = lookUpResult.symbol;
    if (!symbol.hasDeclarations()) {
      throw new Error(`No declaration found for symbol '${nameNode.value}'.`);
    }
    const declarations = symbol.getDeclarations();
    if (declarations.length > 1) {
      throw new Error(
        `Multiple declarations found for symbol '${nameNode.value}'. We don't support this yet.`
      );
    }
    const declaration = declarations[0];

    switch (declaration.type) {
      case DeclarationType.Variable: {
        switch (declaration.node.nodeType) {
          case ParseNodeType.StringList: {
            const value = this.valueEvaluator.getValue(declaration.node);
            const text = Value.toString(value);
            return {
              node: declaration.node,
              code: text,
              dependencies: [],
            };
          }
          case ParseNodeType.Name: {
            // The name node is a variable.
            return this.extractVariableWithDependencies(declaration.node, sourceFile);
          }
          default:
            throw new Error(`Unable to reach here.`);
        }
      }

      case DeclarationType.Function: {
        return this.extractFunctionWithDependencies(declaration.node, sourceFile);
      }

      case DeclarationType.Class: {
        return this.extractClassWithDependencies(declaration.node, sourceFile);
      }

      case DeclarationType.Alias: {
        switch (declaration.node.nodeType) {
          case ParseNodeType.ImportFromAs:
            return this.extractImportFromAsWithDependencies(declaration.node);
          case ParseNodeType.ImportAs:
            return this.extractImportAsWithDependencies(declaration.node);
          default:
            throw new Error(`Unsupported node type: ${declaration.node.nodeType}`);
        }
      }

      default:
        if (process.env.DEBUG) {
          console.debug(
            "Don't support this declaration: ",
            TextUtils.getTextOfNode(declaration.node, sourceFile)
          );
        }
        throw new Error(`Unsupported declaration type: ${declaration.type}`);
    }
    throw new Error("Unable to reach here.");
  }

  private extractVariableWithDependencies(node: NameNode, sourceFile: SourceFile): CodeSegment {
    if (node.parent?.nodeType !== ParseNodeType.Assignment) {
      throw new Error(
        `We only support the simplest assignment statement, the tuple assignment or other statements are not supported yet.`
      );
    }

    const dependencies: CodeSegment[] = [];
    let rightExpressionText = "";

    const rightExpression = node.parent.rightExpression;
    const segment = this.extractExpressionWithDependencies(rightExpression, sourceFile);
    if (rightExpression.nodeType === ParseNodeType.Name) {
      // If the expression on the right is a named node, then the code segment includes the
      // declaration of this named node. We should add this declaration segment to the dependencies
      // and use the value of the named node as the text for the right expression.
      dependencies.push(segment);
      rightExpressionText = rightExpression.value;
    } else {
      // Otherwise, the code segment includes the expression itself, and we should add the
      // dependencies of the expression to the current segment's dependencies. And use the code of
      // the expression as the text for the right expression.
      dependencies.push(...segment.dependencies);
      rightExpressionText = segment.code;
    }

    const statement = `${node.value} = ${rightExpressionText}`;
    return {
      node: node,
      exportableName: node.value,
      code: statement,
      dependencies: dependencies,
    };
  }

  private extractFunctionWithDependencies(
    funcNode: FunctionNode,
    sourceFile: SourceFile
  ): CodeSegment {
    const functionScope = getScopeForNode(funcNode.suite);
    if (!functionScope) {
      throw new Error(`No scope found for this function '${funcNode.name.value}'.`);
    }

    const walker = new OutsideSymbolFinder(this.typeEvaluator, functionScope, funcNode.name);
    walker.walk(funcNode);

    const dependencies: CodeSegment[] = [];
    for (const nameNode of walker.nameNodes) {
      const dep = this.extractNameNodeWithDependencies(nameNode, sourceFile);
      dependencies.push(dep);
    }

    return {
      node: funcNode,
      exportableName: funcNode.name.value,
      code: TextUtils.getTextOfNode(funcNode, sourceFile)!,
      dependencies,
      calledClientApis: this.accessedSpecialNodeFinder.findClientApiCalls(funcNode),
      accessedCapturedProps: this.accessedSpecialNodeFinder.findCapturedProperties(funcNode),
    };
  }

  private extractCallWithDependencies(node: CallNode, sourceFile: SourceFile): CodeSegment {
    // If this call node is for constructing a resource object, we don't need to extract the
    // function type argument from it. The function type argument will be sent to the cloud and
    // accessed via RPC.
    const extractFunctionArg = !this.specialNodeMap.getNodeById(
      node.id,
      TypeConsts.IRESOURCE_FULL_NAME
    );

    const dependencies: CodeSegment[] = [];
    // The code for building each argument of the construct statement.
    const argumentCodes: string[] = [];
    node.arguments.forEach((arg) => {
      const segment = this.extractArgumentWithDependencies(arg, sourceFile, extractFunctionArg);
      dependencies.push(...segment.dependencies);
      argumentCodes.push(segment.code);
    });

    let methodCode = "";
    const segment = this.extractExpressionWithDependencies(node.leftExpression, sourceFile);
    if (node.leftExpression.nodeType === ParseNodeType.Name) {
      // If this left expression is a name node, then the code segment encapsulates the declaration
      // corresponding to this node.
      dependencies.push(segment);
      methodCode = node.leftExpression.value;
    } else {
      // If the left expression if not a name node, it may be a member access node, the segment
      // encapsulates the caller expression itself. So, we add the dependencies of the caller's
      // expression to the current segment's dependencies. And use the code of the caller's
      // expression as the text for the left expression.
      dependencies.push(...segment.dependencies);
      methodCode = segment.code;
    }

    const statement = `${methodCode}(${argumentCodes.join(", ")})`;
    return {
      node: node,
      code: statement,
      dependencies,
      calledClientApis: this.accessedSpecialNodeFinder.findClientApiCalls(node),
      accessedCapturedProps: this.accessedSpecialNodeFinder.findCapturedProperties(node),
    };
  }

  private extractArgumentWithDependencies(
    arg: ArgumentNode,
    sourceFile: SourceFile,
    extractFunctionArg: boolean
  ): CodeSegment {
    const codePrefix = arg.name ? `${arg.name.value}=` : "";

    if (
      TypeUtils.isLambdaNode(arg.valueExpression) ||
      TypeUtils.isFunctionVar(arg.valueExpression, this.typeEvaluator)
    ) {
      // The argument is either a lambda function, a function variable, or a function call which
      // returns a function.
      if (!extractFunctionArg) {
        // If we don't need to extract the function argument, we just use a lambda function as a
        // placeholder.
        return {
          node: arg,
          code: `${codePrefix}lambda _: _`,
          dependencies: [],
        };
      }
    }

    const segment = this.extractExpressionWithDependencies(arg.valueExpression, sourceFile);
    if (arg.valueExpression.nodeType === ParseNodeType.Name) {
      // If the expression is a name node, then the code segment encapsulates the declaration of
      // this node. We should add this declaration segment to the dependencies. And use the value of
      // the named node as the text for the argument expression.
      return {
        node: arg,
        code: `${codePrefix}${arg.valueExpression.value}`,
        dependencies: [segment],
      };
    } else {
      // Otherwise, we use the code of the expression as the text for the argument expression, so we
      // just directly return the segment of the expression.
      return {
        node: arg,
        code: `${codePrefix}${segment.code}`,
        dependencies: segment.dependencies,
      };
    }
  }

  /**
   * Extract the class definition and its dependencies.
   * @param classNode - The class node.
   * @param sourceFile - The source file where the class node is located.
   */
  private extractClassWithDependencies(classNode: ClassNode, sourceFile: SourceFile): CodeSegment {
    const nodeText = TextUtils.getTextOfNode(classNode, sourceFile);

    const classScope = getScopeForNode(classNode.suite);
    if (!classScope) {
      throw new Error(`No scope found for this lambda function '${nodeText}'.`);
    }

    const walker = new OutsideSymbolFinder(this.typeEvaluator, classScope, classNode.name);
    walker.walk(classNode);

    const dependencies: CodeSegment[] = [];
    for (const nameNode of walker.nameNodes) {
      const dep = this.extractNameNodeWithDependencies(nameNode, sourceFile);
      dependencies.push(dep);
    }

    return {
      node: classNode,
      exportableName: classNode.name.value,
      code: nodeText!,
      dependencies,
      calledClientApis: this.accessedSpecialNodeFinder.findClientApiCalls(classNode),
      accessedCapturedProps: this.accessedSpecialNodeFinder.findCapturedProperties(classNode),
    };
  }

  /**
   * Extract the member access expression, like `obj.method`, `func().method`, `module.method`, etc.
   * Only the left expression needs to be extracted, as the right expression is the method name,
   * which isn't a dependency.
   * @param node - The member access node.
   * @param sourceFile - The source file where the member access node is located.
   */
  private extractMemberAccessWithDependencies(
    node: MemberAccessNode,
    sourceFile: SourceFile
  ): CodeSegment {
    const callerSegment = this.extractExpressionWithDependencies(node.leftExpression, sourceFile);

    let code = "";
    const dependencies: CodeSegment[] = [];
    if (node.leftExpression.nodeType === ParseNodeType.Name) {
      // Like `obj.method`, `module.method`, etc.
      dependencies.push(callerSegment);
      code = `${node.leftExpression.value}.${node.memberName.value}`;
    } else {
      // Like `func().method`, `func().attr.method`, etc.
      dependencies.push(...callerSegment.dependencies);
      code = `${callerSegment.code}.${node.memberName.value}`;
    }

    return {
      node: node,
      code: code,
      dependencies: dependencies,
    };
  }

  /**
   * Extract the import-from statement, such as `from module import name`, `from module import name
   * as alias`.
   * @param node
   * @returns
   */
  private extractImportFromAsWithDependencies(node: ImportFromAsNode): CodeSegment {
    assert(node.parent?.nodeType === ParseNodeType.ImportFrom);
    const moduleNameNode = node.parent.module;
    const moduleName = AnalyzerNodeInfo.getImportInfo(moduleNameNode)?.importName;
    assert(moduleName);

    const name = node.name.value;
    const alias = node.alias?.value;
    const statement = `from ${moduleName} import ${name}` + (alias ? ` as ${alias}` : "");
    return {
      node: node,
      code: statement,
      dependencies: [],
    };
  }

  /**
   * Extract the import statement, such as `import module`, `import module as alias`.
   * @param node - The import-as node.
   */
  private extractImportAsWithDependencies(node: ImportAsNode): CodeSegment {
    const moduleNameNode = node.module;
    const moduleName = AnalyzerNodeInfo.getImportInfo(moduleNameNode)?.importName;
    assert(moduleName);

    const alias = node.alias?.value;
    const statement = `import ${moduleName}` + (alias ? ` as ${alias}` : "");
    return {
      node: node,
      code: statement,
      dependencies: [],
    };
  }
}

/**
 * Get the symbols that are used in the function but defined outside of it, and not in the built-in
 * scope.
 */
class OutsideSymbolFinder extends ParseTreeWalker {
  /**
   * The name nodes that defined outside of the function, and not in the built-in scope.
   */
  public readonly nameNodes: NameNode[] = [];

  constructor(
    private readonly typeEvaluator: TypeEvaluator,
    private readonly scope: Scope,
    private readonly rootNode?: ParseNode
  ) {
    super();
  }

  public override visitName(node: NameNode): boolean {
    if (node !== this.rootNode && !this.shouldIgnore(node)) {
      const symbol = this.typeEvaluator.lookUpSymbolRecursive(node, node.value, false);
      assert(symbol); // The symbol cannot be undefined; it's checked in `shouldIgnore`.
      this.nameNodes.push(node);
    }
    return true;
  }

  private shouldIgnore(node: NameNode): boolean {
    const symbolWithScope = this.typeEvaluator.lookUpSymbolRecursive(node, node.value, false);
    if (symbolWithScope && ScopeUtils.isScopeContainedWithin(symbolWithScope.scope, this.scope)) {
      // The symbol is defined in the function's scope.
      return true;
    }

    if (this.scope.lookUpSymbol(node.value)) {
      // Ignore the local variables. We don't need to package the local variables.
      return true;
    }

    if (node.parent?.nodeType === ParseNodeType.MemberAccess && node.parent.memberName === node) {
      // Ignore the member access. We just need to check if the caller is outside of the scope.
      return true;
    }

    if (node.parent?.nodeType === ParseNodeType.Argument && node.parent.name === node) {
      // Ignore the argument name.
      return true;
    }

    if (node.parent?.nodeType === ParseNodeType.Parameter && node.parent.name === node) {
      // Ignore the parameter name.
      return true;
    }

    if (node.value === "self") {
      // Ignore the `self` parameter.
      return true;
    }

    // Check if the symbol linked to this node is from the built-in scope.
    // ```python
    // isinstance(arr, list)
    // name: str = "hello"
    // ```
    const result = this.typeEvaluator.lookUpSymbolRecursive(node, node.value, false);
    if (!result) {
      throw new Error(`No symbol found for node '${node.value}'.`);
    }
    if (result.scope === getBuiltInScope(this.scope)) {
      // This symobl is from the built-in scope.
      return true;
    }
    return false;
  }
}

interface AccessedSpecialNodeIds {
  readonly constructorCalls: readonly number[];
  readonly clientApiCalls: readonly number[];
  readonly capturedProperties: readonly number[];
}

/**
 * Find the special nodes that are accessed in the given parse node.
 */
class AccessedSpecialNodeFinder {
  private readonly accessedSpecialNodesMap: Map<number, AccessedSpecialNodeIds> = new Map();

  constructor(private readonly sepcialNodeMap: SpecialNodeMap<CallNode>) {}

  public findClientApiCalls(node: ParseNode): CallNode[] {
    const accessedSpecialNodes = this.visit(node);
    return accessedSpecialNodes.clientApiCalls.map(
      (id) => this.sepcialNodeMap.getNodeById(id, TypeConsts.IRESOURCE_CLIENT_API_FULL_NAME)!
    );
  }

  public findCapturedProperties(node: ParseNode): CallNode[] {
    const accessedSpecialNodes = this.visit(node);
    return accessedSpecialNodes.capturedProperties.map(
      (id) => this.sepcialNodeMap.getNodeById(id, TypeConsts.IRESOURCE_CAPTURED_PROPS_FULL_NAME)!
    );
  }

  private visit(node: ParseNode): AccessedSpecialNodeIds {
    if (this.accessedSpecialNodesMap.has(node.id)) {
      return this.accessedSpecialNodesMap.get(node.id)!;
    }

    const constructorCalls: number[] = [];
    const clientApiCalls: number[] = [];
    const capturedProperties: number[] = [];

    if (node.nodeType === ParseNodeType.Call) {
      if (this.sepcialNodeMap.getNodeById(node.id, TypeConsts.IRESOURCE_FULL_NAME)) {
        constructorCalls.push(node.id);
      }
      if (this.sepcialNodeMap.getNodeById(node.id, TypeConsts.IRESOURCE_CLIENT_API_FULL_NAME)) {
        clientApiCalls.push(node.id);
      }
      if (this.sepcialNodeMap.getNodeById(node.id, TypeConsts.IRESOURCE_CAPTURED_PROPS_FULL_NAME)) {
        capturedProperties.push(node.id);
      }
    }

    getChildNodes(node).forEach((child) => {
      if (!child) {
        return;
      }

      const childAccessedNodes = this.visit(child);
      constructorCalls.push(...childAccessedNodes.constructorCalls);
      clientApiCalls.push(...childAccessedNodes.clientApiCalls);
      capturedProperties.push(...childAccessedNodes.capturedProperties);
    });

    const accessedSpecialNodes = { constructorCalls, clientApiCalls, capturedProperties };
    this.accessedSpecialNodesMap.set(node.id, accessedSpecialNodes);
    return accessedSpecialNodes;
  }
}

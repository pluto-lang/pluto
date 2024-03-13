import assert from "node:assert";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import {
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
import { TypeBase } from "pyright-internal/dist/analyzer/types";
import { DeclarationType } from "pyright-internal/dist/analyzer/declaration";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import * as AnalyzerNodeInfo from "pyright-internal/dist/analyzer/analyzerNodeInfo";
import { getBuiltInScope, getScopeForNode } from "pyright-internal/dist/analyzer/scopeUtils";
import * as TextUtils from "./text-utils";
import * as TypeUtils from "./type-utils";
import * as TypeConsts from "./type-consts";
import * as ScopeUtils from "./scope-utils";
import { Value, ValueEvaluator } from "./value-evaluator";
import { ResourceObjectTracker } from "./resource-object-tracker";

export interface Closure {
  readonly node: ParseNode;
  /**
   * If a closure hasn't an exportable name, it means the closure is a lambda function or a function
   * call.
   */
  readonly exportableName?: string;
  /**
   * The code after being transformed from a node expression, including constant folding, etc. It
   * contains only one expression or statement, with its dependencies specified in the
   * `dependencies`.
   */
  readonly code: string;
  readonly dependencies: Closure[];
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Closure {
  export function toString(closure: Closure, extractedNodeIds: Set<number> = new Set()): string {
    const deps = closure.dependencies
      .map((dep) => Closure.toString(dep, extractedNodeIds))
      .join("\n");

    if (extractedNodeIds.has(closure.node.id)) {
      // Avoid extracting the same node multiple times.
      return deps;
    }

    extractedNodeIds.add(closure.node.id);
    return `${deps}\n${closure.code}`;
  }
}

export class ClosureExtractor {
  constructor(
    private readonly typeEvaluator: TypeEvaluator,
    private readonly resourceObjTracker: ResourceObjectTracker,
    private readonly valueEvaluator: ValueEvaluator
  ) {}

  public extractClosure(node: ExpressionNode, sourceFile: SourceFile): Closure {
    let closure: Closure | undefined;
    switch (node.nodeType) {
      case ParseNodeType.Lambda:
        closure = this.extractClosureForLambda(node, sourceFile);
        break;
      case ParseNodeType.Name:
        closure = this.extractClosureForNameNode(node, sourceFile);
        break;
      case ParseNodeType.Call:
        closure = this.extractClosureForCall(node, sourceFile);
        break;
      case ParseNodeType.MemberAccess:
        closure = this.extractClosureForMemberAccess(node, sourceFile);
        break;
      default:
        throw new Error(`Unsupported node type: ${node.nodeType}`);
    }
    return closure;
  }

  private extractClosureForLambda(lambdaNode: LambdaNode, sourceFile: SourceFile): Closure {
    const nodeText = TextUtils.getTextOfNode(lambdaNode, sourceFile);

    const lambdaScope = getScopeForNode(lambdaNode.expression);
    if (!lambdaScope) {
      throw new Error(`No scope found for this lambda function '${nodeText}'.`);
    }

    // Find the symbols that are used in the lambda function but defined outside of it.
    const walker = new OutsideSymbolFinder(this.typeEvaluator, lambdaScope);
    walker.walk(lambdaNode);

    // Get the dependencies of the lambda function.
    const dependencies: Closure[] = [];
    for (const nameNode of walker.nameNodes) {
      const dep = this.extractClosureForNameNode(nameNode, sourceFile);
      dependencies.push(dep);
    }

    return {
      node: lambdaNode,
      code: nodeText!,
      dependencies,
    };
  }

  /**
   * The name node can represent various types of nodes, like variables, functions, classes, etc.
   * When dealing with the name node, we extract what it refers to—the declaration—rather than the
   * node itself, and return the closure for that declaration. Therefore, the function's return
   * value is the closure of the declaration associated with the name node.
   */
  private extractClosureForNameNode(nameNode: NameNode, sourceFile: SourceFile): Closure {
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
            return this.extractClosureForVariable(declaration.node, sourceFile);
          }
          default:
            throw new Error(`Unable to reach here.`);
        }
      }

      case DeclarationType.Function: {
        return this.extractClosureForFunction(declaration.node, sourceFile);
      }

      case DeclarationType.Class: {
        return this.extractClosureForClass(declaration.node, sourceFile);
      }

      case DeclarationType.Alias: {
        switch (declaration.node.nodeType) {
          case ParseNodeType.ImportFromAs:
            return this.extractClosureForImportFromAs(declaration.node);
          case ParseNodeType.ImportAs:
            return this.extractClosureForImportAs(declaration.node);
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

  private extractClosureForVariable(node: NameNode, sourceFile: SourceFile): Closure {
    if (node.parent?.nodeType !== ParseNodeType.Assignment) {
      throw new Error(
        `We only support the simplest assignment statement, the tuple assignment or other statements are not supported yet.`
      );
    }

    const dependencies: Closure[] = [];
    let rightExpressionText = "";
    const rightExpression = node.parent.rightExpression;

    const type = this.typeEvaluator.getType(node);
    if (
      type &&
      TypeBase.isInstance(type) &&
      TypeUtils.isSubclassOf(type, TypeConsts.IRESOURCE_FULL_NAME)
    ) {
      // If the type of this node is a resource object, we directly construct the statement that
      // builds the client object for this resource object.
      const constructNode = this.resourceObjTracker.getConstructNodeByNameNode(node, sourceFile);
      if (!constructNode) {
        throw new Error(`No construct node found for the resource object '${node.value}'.`);
      }
      const closure = this.extractClosureForCall(
        constructNode,
        sourceFile,
        /* extractFunctionArg */ false
      );
      dependencies.push(...closure.dependencies);
      rightExpressionText = closure.code;
    } else if (rightExpression.nodeType === ParseNodeType.Call) {
      // If the right expression is a function call, we extract the closure for the call.
      const closure = this.extractClosureForCall(
        rightExpression,
        sourceFile,
        /* extractFunctionArg */ true
      );
      dependencies.push(...closure.dependencies);
      rightExpressionText = closure.code;
    } else {
      // Otherwise, this variable should be a literal type. Currently we only support the literal
      // type. So, we use the ValueEvaluator to get the value of the variable. If this variable is
      // not a literal type, the ValueEvaluator will throw an error.
      const value = this.valueEvaluator.getValue(node.parent.rightExpression);
      rightExpressionText = Value.toString(value);
    }

    const statement = `${node.value} = ${rightExpressionText}`;
    return {
      node: node,
      exportableName: node.value,
      code: statement,
      dependencies: dependencies,
    };
  }

  private extractClosureForFunction(funcNode: FunctionNode, sourceFile: SourceFile): Closure {
    const functionScope = getScopeForNode(funcNode.suite);
    if (!functionScope) {
      throw new Error(`No scope found for this function '${funcNode.name.value}'.`);
    }

    const walker = new OutsideSymbolFinder(this.typeEvaluator, functionScope, funcNode.name);
    walker.walk(funcNode);

    const dependencies: Closure[] = [];
    for (const nameNode of walker.nameNodes) {
      const dep = this.extractClosureForNameNode(nameNode, sourceFile);
      dependencies.push(dep);
    }

    return {
      node: funcNode,
      exportableName: funcNode.name.value,
      code: TextUtils.getTextOfNode(funcNode, sourceFile)!,
      dependencies,
    };
  }

  private extractClosureForCall(
    node: CallNode,
    sourceFile: SourceFile,
    extractFunctionArg: boolean = true
  ): Closure {
    const dependencies: Closure[] = [];
    // The types that are used in the construct statement.
    const usedTypes = new Set<string>();
    // The code for building each argument of the construct statement.
    const argumentCodes: string[] = [];
    node.arguments.forEach((arg) => {
      if (
        TypeUtils.isLambdaNode(arg.valueExpression) ||
        TypeUtils.isFunctionVar(arg.valueExpression, this.typeEvaluator)
      ) {
        // The argument is either a lambda function or a function variable.
        if (!extractFunctionArg) {
          // If we don't need to extract the function argument, we just use a lambda function as a
          // placeholder.
          argumentCodes.push("lambda _: _");
          return;
        }

        if (arg.valueExpression.nodeType === ParseNodeType.Lambda) {
          // Lambda expression
          const closure = this.extractClosureForLambda(arg.valueExpression, sourceFile);
          dependencies.push(...closure.dependencies);
          // Use the lambda expression itself as the argument text.
          argumentCodes.push(closure.code);
        } else {
          // Function variable
          const closure = this.extractClosure(arg.valueExpression, sourceFile);
          dependencies.push(closure);
          // Use the variable name as the argument text.
          argumentCodes.push(TextUtils.getTextOfNode(arg.valueExpression, sourceFile)!);
        }
        return;
      }

      // The argument should be a regular expression, but currently, we're only set up to handle the
      // literal type. If it's anything else, the ValueEvaluator will toss out an error.
      const value = this.valueEvaluator.getValue(arg.valueExpression);
      const text = Value.toString(value, /* containModuleName */ false);
      argumentCodes.push(text);
      const classes = Value.getTypes(value);
      classes.forEach((cls) => usedTypes.add(cls));
    });

    Array.from(usedTypes).forEach((imp) => {
      const lastDot = imp.lastIndexOf(".");
      const moduleName = imp.slice(0, lastDot);
      const className = imp.slice(lastDot + 1);
      dependencies.push({
        node: node,
        code: `from ${moduleName} import ${className}`,
        dependencies: [],
      });
    });

    const closure = this.extractClosure(node.leftExpression, sourceFile);
    if (node.leftExpression.nodeType === ParseNodeType.Name) {
      // If this left expression is a name node, then the closure encapsulates the declaration
      // corresponding to this node.
      dependencies.push(closure);
    } else {
      // If the left expression if not a name node, it may be a member access node, the closure
      // encapsulates the caller expression itself. We don't need to encapsulate the caller's
      // expression, because the caller's expression will be encapsulated in current closure.
      dependencies.push(...closure.dependencies);
    }

    // The statement that constructs the resource object.
    const method = TextUtils.getTextOfNode(node.leftExpression, sourceFile);
    const statement = `${method}(${argumentCodes.join(", ")})`;
    return {
      node: node,
      code: statement,
      dependencies,
    };
  }

  private extractClosureForClass(classNode: ClassNode, sourceFile: SourceFile): Closure {
    const nodeText = TextUtils.getTextOfNode(classNode, sourceFile);

    const classScope = getScopeForNode(classNode.suite);
    if (!classScope) {
      throw new Error(`No scope found for this lambda function '${nodeText}'.`);
    }

    const walker = new OutsideSymbolFinder(this.typeEvaluator, classScope, classNode.name);
    walker.walk(classNode);

    const dependencies: Closure[] = [];
    for (const nameNode of walker.nameNodes) {
      const dep = this.extractClosureForNameNode(nameNode, sourceFile);
      dependencies.push(dep);
    }

    return {
      node: classNode,
      exportableName: classNode.name.value,
      code: nodeText!,
      dependencies,
    };
  }

  private extractClosureForMemberAccess(node: MemberAccessNode, sourceFile: SourceFile): Closure {
    const callerClosure = this.extractClosure(node.leftExpression, sourceFile);

    const dependencies: Closure[] = [];
    if (node.leftExpression.nodeType === ParseNodeType.Name) {
      dependencies.push(callerClosure);
    } else {
      dependencies.push(...callerClosure.dependencies);
    }

    return {
      node: node,
      code: TextUtils.getTextOfNode(node, sourceFile)!,
      dependencies: dependencies,
    };
  }

  /**
   * from module import name as alias
   * @param node
   * @returns
   */
  private extractClosureForImportFromAs(node: ImportFromAsNode): Closure {
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
   * import module as alias
   * @param node
   * @returns
   */
  private extractClosureForImportAs(node: ImportAsNode): Closure {
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
      // Ignore the local variables. We don't need to package the local variables to the closure.
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

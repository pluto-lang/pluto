import assert from "assert";
import {
  BinaryOperationNode,
  ConstantNode,
  DictionaryNode,
  ExpressionNode,
  FormatStringNode,
  IndexNode,
  NameNode,
  ParseNode,
  ParseNodeType,
  StringListNode,
  StringNode,
  TupleNode,
} from "pyright-internal/dist/parser/parseNodes";
import { KeywordType } from "pyright-internal/dist/parser/tokenizerTypes";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import * as TypeUtils from "../type-utils";
import {
  BinaryOperationTreeNode,
  ConstantTreeNode,
  DictionaryTreeNode,
  FormatStringTreeNode,
  IndexTreeNode,
  ParameterTreeNode,
  StringListTreeNode,
  StringTreeNode,
  TreeNode,
  TupleTreeNode,
} from "./value-tree-types";
import { getNodeText } from "./utils";

type CreateNodeFunction<T extends ExpressionNode> = (node: T) => TreeNode;

/**
 * TreeBuilder is used to build the value tree from the expression node. The value tree is a tree
 * structure where each node represents an **expression** that can be evaluated. The value of each node
 * is the value of the expression.
 */
export class TreeBuilder {
  private readonly treeMap: Map<number, TreeNode> = new Map();

  constructor(private readonly typeEvaluator: TypeEvaluator) {}

  private readonly createNodeFunctions: { [NodeType in ParseNodeType]?: CreateNodeFunction<any> } =
    {
      [ParseNodeType.Error]: this.unimplementedNode,
      [ParseNodeType.UnaryOperation]: this.unimplementedNode,
      [ParseNodeType.BinaryOperation]: this.createNodeForBinaryOperation,
      [ParseNodeType.Assignment]: this.unimplementedNode,
      [ParseNodeType.TypeAnnotation]: this.unimplementedNode,
      [ParseNodeType.AssignmentExpression]: this.unimplementedNode,
      [ParseNodeType.AugmentedAssignment]: this.unimplementedNode,
      [ParseNodeType.Await]: this.unimplementedNode,
      [ParseNodeType.Ternary]: this.unimplementedNode,
      [ParseNodeType.Unpack]: this.unimplementedNode,
      [ParseNodeType.ListComprehension]: this.unimplementedNode,
      [ParseNodeType.Slice]: this.unimplementedNode,
      [ParseNodeType.Yield]: this.unimplementedNode,
      [ParseNodeType.YieldFrom]: this.unimplementedNode,
      [ParseNodeType.MemberAccess]: this.unimplementedNode,
      [ParseNodeType.Lambda]: this.unimplementedNode,
      [ParseNodeType.Constant]: this.createNodeForConstant,
      [ParseNodeType.Ellipsis]: this.unimplementedNode,
      [ParseNodeType.Number]: this.unimplementedNode,
      [ParseNodeType.String]: this.createNodeForString,
      [ParseNodeType.FormatString]: this.createNodeForFormatString,
      [ParseNodeType.StringList]: this.createNodeForStringList,
      [ParseNodeType.List]: this.unimplementedNode,
      [ParseNodeType.Set]: this.unimplementedNode,
      [ParseNodeType.Name]: this.createNodeForName,
      [ParseNodeType.Call]: this.unimplementedNode,
      [ParseNodeType.Index]: this.createNodeForIndex,
      [ParseNodeType.Tuple]: this.createNodeForTuple,
      [ParseNodeType.Dictionary]: this.createNodeForDictionary,
    };

  public createNode(node: ExpressionNode): TreeNode {
    if (this.treeMap.has(node.id)) {
      return this.treeMap.get(node.id)!;
    }

    const createNodeFunction = this.createNodeFunctions[node.nodeType];
    if (!createNodeFunction) {
      throw new Error(`This type of node '${node.nodeType}' cannot serve as a tree node.`);
    }

    const treeNode = createNodeFunction.call(this, node);
    this.treeMap.set(node.id, treeNode);
    return treeNode;
  }

  private createNodeForName(node: NameNode): TreeNode {
    const decls = this.typeEvaluator.getDeclarationsForNameNode(
      node,
      /* skipUnreachableCode */ true
    );
    if (!decls || decls.length === 0) {
      throw new Error(`No declaration found for name node: ${getNodeText(node)}`);
    }

    // TODO: assume the last declaration is the one we want to evaluate,
    const decl = decls[decls.length - 1];
    if (decl.node.nodeType === ParseNodeType.Parameter) {
      assert(
        decl.node.name !== undefined,
        `${getNodeText(decl.node)}: Parameter node should have a name.`
      );

      const defaultValueNode = decl.node.defaultValue
        ? this.createNode(decl.node.defaultValue)
        : undefined;

      return ParameterTreeNode.create(decl.node, defaultValueNode);
    }

    if (decl.node.parent?.nodeType !== ParseNodeType.Assignment) {
      // prettier-ignore
      throw new Error(
        `Variable '${getNodeText(node)}' must be assigned a value directly. We only support the simplest assignment statement, the tuple assignment or other statements are not supported yet.`
      );
    }
    return this.createNode(decl.node.parent.rightExpression);
  }

  private createNodeForIndex(node: IndexNode): IndexTreeNode {
    if (!TypeUtils.isEnvVarAccess(node, this.typeEvaluator)) {
      // If this variable receives the value of an environment variable, we need to extract the name
      // of the environment variable, and its default value.
      throw new Error(
        `${getNodeText(node)}: Only support environment variable access using index node.`
      );
    }

    // The environment variable access is in the form of an index, like `os.environ["key"]`.
    if (node.items.length !== 1) {
      throw new Error(
        `${getNodeText(node)}: The index of the 'os.environ' access should have only one item.`
      );
    }

    return IndexTreeNode.create(
      node,
      /* items */ [this.createNode(node.items[0].valueExpression)],
      /* accessEnvVar */ true
    );
  }

  private createNodeForConstant(node: ConstantNode): ConstantTreeNode {
    if (node.constType !== KeywordType.None) {
      throw new Error(
        `${getNodeText(node)}: Only support the constant node with the value 'None'.`
      );
    }
    return ConstantTreeNode.create(node);
  }

  private createNodeForTuple(node: TupleNode): TupleTreeNode {
    return TupleTreeNode.create(
      node,
      /* items */ node.expressions.map((expr) => this.createNode(expr))
    );
  }

  private createNodeForDictionary(node: DictionaryNode): DictionaryTreeNode {
    const items: [TreeNode, TreeNode][] = [];
    for (const entry of node.entries) {
      if (entry.nodeType !== ParseNodeType.DictionaryKeyEntry) {
        throw new Error(
          `We only support the dictionary key-value pair in the dictionary construction expression.`
        );
      }

      items.push([this.createNode(entry.keyExpression), this.createNode(entry.valueExpression)]);
    }

    return DictionaryTreeNode.create(node, items);
  }

  private createNodeForBinaryOperation(node: BinaryOperationNode): BinaryOperationTreeNode {
    const leftNode = this.createNode(node.leftExpression);
    const rightNode = this.createNode(node.rightExpression);
    return BinaryOperationTreeNode.create(node, leftNode, rightNode);
  }

  private createNodeForStringList(node: StringListNode): StringListTreeNode {
    const childNodes = node.strings.map((str) => this.createNode(str));
    return StringListTreeNode.create(node, childNodes);
  }

  private createNodeForString(node: StringNode): StringTreeNode {
    return StringTreeNode.create(node);
  }

  private createNodeForFormatString(node: FormatStringNode): FormatStringTreeNode {
    if (node.formatExpressions.length > 0) {
      throw new Error(
        `${getNodeText(node)}: Format string with format expressions is not supported yet.`
      );
    }

    const fields = node.fieldExpressions.map((n) => this.createNode(n));
    return FormatStringTreeNode.create(node, fields);
  }

  private unimplementedNode(node: ParseNode): never {
    throw new Error(
      `The creation of node type '${node.nodeType}' is not implemented yet. If you need this feature, please submit an issue.`
    );
  }
}

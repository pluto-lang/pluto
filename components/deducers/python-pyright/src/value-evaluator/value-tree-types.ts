import assert from "assert";
import {
  BinaryOperationNode,
  CallNode,
  ConstantNode,
  DictionaryNode,
  ExpressionNode,
  FormatStringNode,
  IndexNode,
  NumberNode,
  ParameterNode,
  ParseNode,
  ParseNodeType,
  StringListNode,
  StringNode,
  TupleNode,
} from "pyright-internal/dist/parser/parseNodes";
import * as AnalyzerNodeInfo from "pyright-internal/dist/analyzer/analyzerNodeInfo";
import { convertOffsetToPosition } from "pyright-internal/dist/common/positionUtils";

export enum TreeNodeFlags {
  Placeholder = 1 << 0, // The node is a parameter placeholder.
  AccessEnvVar = 1 << 1, // The node is accessing an environment variable.
}

/**
 * The value of a node can be evaluated through the dependency graph.
 * value(node) = evaluate(node.dependencies)
 */
export interface TreeNodeBase {
  readonly nodeType: ParseNodeType;
  /**
   * The node is a expression node, e.g. a + b. To evaluate the value of the node, we may need to
   * evaluate the values of its dependencies.
   */
  readonly node: ExpressionNode | ParameterNode; // a + b
  readonly flags?: TreeNodeFlags;

  print(): string;
}

export interface ParameterTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.Parameter;
  readonly node: ParameterNode;
  readonly defaultValue?: TreeNode;
}

export namespace ParameterTreeNode {
  export function create(parseNode: ParameterNode, defaultValue?: TreeNode) {
    assert(parseNode.name !== undefined, "Parameter name is undefined");

    const node: ParameterTreeNode = {
      nodeType: ParseNodeType.Parameter,
      node: parseNode,
      defaultValue: defaultValue,
      flags: TreeNodeFlags.Placeholder,
      print: () => getNodeText(parseNode, "Parameter"),
    };

    return node;
  }
}

export interface IndexTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.Index;
  readonly node: IndexNode;
  readonly items: TreeNode[];
}

export namespace IndexTreeNode {
  export function create(parseNode: IndexNode, items: TreeNode[], accessEnvVar?: boolean) {
    const node: IndexTreeNode = {
      nodeType: ParseNodeType.Index,
      node: parseNode,
      items: items,
      flags: accessEnvVar ? TreeNodeFlags.AccessEnvVar : undefined,
      print: () => `${getNodeText(parseNode, "Index")}[${items.map((i) => i.node.id).join(",")}]`,
    };

    return node;
  }
}

export interface TupleTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.Tuple;
  readonly node: TupleNode;
  readonly items: TreeNode[];
}

export namespace TupleTreeNode {
  export function create(parseNode: TupleNode, items: TreeNode[]) {
    const node: TupleTreeNode = {
      nodeType: ParseNodeType.Tuple,
      node: parseNode,
      items: items,
      print: () => `${getNodeText(parseNode, "Tuple")}(${items.map((i) => i.node.id).join(",")})`,
    };

    return node;
  }
}

export interface DictionaryTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.Dictionary;
  readonly node: DictionaryNode;
  readonly items: [TreeNode, TreeNode][];
}

export namespace DictionaryTreeNode {
  export function create(parseNode: DictionaryNode, items: [TreeNode, TreeNode][]) {
    const node: DictionaryTreeNode = {
      nodeType: ParseNodeType.Dictionary,
      node: parseNode,
      items: items,
      print: () =>
        `${getNodeText(parseNode, "Dictionary")}{${items
          .map(([k, v]) => `${k.node.id}: ${v.node.id}`)
          .join(",")}}`,
    };

    return node;
  }
}

export interface CallTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.Call;
  readonly node: CallNode;
  readonly args: TreeNode[];
  readonly dataclass?: boolean;
}

export namespace CallTreeNode {
  export interface CreateOptions {
    accessEnvVar?: boolean;
    dataclass?: boolean;
  }

  export function create(parseNode: CallNode, args: TreeNode[], options?: CreateOptions) {
    const node: CallTreeNode = {
      nodeType: ParseNodeType.Call,
      node: parseNode,
      args: args,
      flags: options?.accessEnvVar ? TreeNodeFlags.AccessEnvVar : undefined,
      dataclass: options?.dataclass,
      print: () => `${getNodeText(parseNode, "Call")}(${args.map((a) => a.node.id).join(",")})`,
    };

    return node;
  }
}

export interface BinaryOperationTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.BinaryOperation;
  readonly node: BinaryOperationNode;
  readonly left: TreeNode;
  readonly right: TreeNode;
}

export namespace BinaryOperationTreeNode {
  export function create(parseNode: BinaryOperationNode, left: TreeNode, right: TreeNode) {
    const node: BinaryOperationTreeNode = {
      nodeType: ParseNodeType.BinaryOperation,
      node: parseNode,
      left: left,
      right: right,
      print: () =>
        `${getNodeText(parseNode, `BinaryOperation#${parseNode.operator}`)}(${left.node.id}, ${
          right.node.id
        })`,
    };

    return node;
  }
}

export interface StringListTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.StringList;
  readonly node: StringListNode;
  readonly strings: TreeNode[];
}

export namespace StringListTreeNode {
  export function create(parseNode: StringListNode, strings: TreeNode[]) {
    const node: StringListTreeNode = {
      nodeType: ParseNodeType.StringList,
      node: parseNode,
      strings: strings,
      print: () =>
        `${getNodeText(parseNode, "StringList")}(${strings.map((s) => s.node.id).join(",")})`,
    };

    return node;
  }
}

export interface StringTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.String;
  readonly node: StringNode;
}

export namespace StringTreeNode {
  export function create(parseNode: StringNode) {
    const node: StringTreeNode = {
      nodeType: ParseNodeType.String,
      node: parseNode,
      print: () => `${getNodeText(parseNode, "String")}`,
    };

    return node;
  }
}

export interface FormatStringTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.FormatString;
  readonly node: FormatStringNode;
  readonly fields: TreeNode[];
}

export namespace FormatStringTreeNode {
  export function create(parseNode: FormatStringNode, fields: TreeNode[]) {
    const node: FormatStringTreeNode = {
      nodeType: ParseNodeType.FormatString,
      node: parseNode,
      fields: fields,
      print: () =>
        `${getNodeText(parseNode, "FormatString")}(${fields.map((e) => e.node.id).join(",")})`,
    };

    return node;
  }
}

export interface ConstantTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.Constant;
  readonly node: ConstantNode;
}

export namespace ConstantTreeNode {
  export function create(parseNode: ConstantNode) {
    const node: ConstantTreeNode = {
      nodeType: ParseNodeType.Constant,
      node: parseNode,
      print: () => `${getNodeText(parseNode, "Constant")}`,
    };

    return node;
  }
}

export interface NumberTreeNode extends TreeNodeBase {
  readonly nodeType: ParseNodeType.Number;
  readonly node: NumberNode;
}

export namespace NumberTreeNode {
  export function create(parseNode: NumberNode) {
    const node: NumberTreeNode = {
      nodeType: ParseNodeType.Number,
      node: parseNode,
      print: () => `${getNodeText(parseNode, "Number")}`,
    };

    return node;
  }
}

export type TreeNode =
  | ParameterTreeNode
  | IndexTreeNode
  | TupleTreeNode
  | DictionaryTreeNode
  | CallTreeNode
  | BinaryOperationTreeNode
  | StringListTreeNode
  | StringTreeNode
  | FormatStringTreeNode
  | ConstantTreeNode
  | NumberTreeNode;

function getNodeText(node: ParseNode, nodeType: string): string {
  const fileInfo = AnalyzerNodeInfo.getFileInfo(node);
  const startPos = convertOffsetToPosition(node.start, fileInfo.lines);
  return `${nodeType}@${node.id}<${startPos.line + 1}:${startPos.character + 1}>`;
}

export function listDependencies(node: TreeNode) {
  switch (node.nodeType) {
    case ParseNodeType.Parameter:
    case ParseNodeType.String:
    case ParseNodeType.Constant:
    case ParseNodeType.Number:
      return [];
    case ParseNodeType.Tuple:
    case ParseNodeType.Index:
      return node.items;
    case ParseNodeType.Dictionary:
      return node.items.flatMap(([k, v]) => [k, v]);
    case ParseNodeType.Call:
      return node.args;
    case ParseNodeType.BinaryOperation:
      return [node.left, node.right];
    case ParseNodeType.StringList:
      return node.strings;
    case ParseNodeType.FormatString:
      return node.fields;
    default:
      throw new Error(`Unable to reach here.`);
  }
}

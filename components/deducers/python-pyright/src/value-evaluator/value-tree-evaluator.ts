import assert from "assert";
import { ParseNodeType } from "pyright-internal/dist/parser/parseNodes";
import { KeywordType, OperatorType } from "pyright-internal/dist/parser/tokenizerTypes";
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
  TreeNodeBase,
  TreeNodeFlags,
  TupleTreeNode,
} from "./value-tree-types";
import { getNodeText } from "./utils";
import {
  Value,
  ValueType,
  EnvVarAccessValue,
  DictValue,
  LiteralValue,
  TupleValue,
  NoneValue,
} from "./value-types";

type EvaluateFunction<T extends TreeNodeBase> = (node: T, fillings: Map<number, Value>) => Value;

export class TreeEvaluator {
  constructor() {}

  private readonly createNodeFunctions: { [NodeType in ParseNodeType]?: EvaluateFunction<any> } = {
    [ParseNodeType.Error]: this.unimplementedNode,
    [ParseNodeType.UnaryOperation]: this.unimplementedNode,
    [ParseNodeType.BinaryOperation]: this.evaluateForBinaryOperation,
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
    [ParseNodeType.Constant]: this.evaluateForConstant,
    [ParseNodeType.Ellipsis]: this.unimplementedNode,
    [ParseNodeType.Number]: this.unimplementedNode,
    [ParseNodeType.String]: this.evaluateForString,
    [ParseNodeType.FormatString]: this.evaluateForFormatString,
    [ParseNodeType.StringList]: this.evaluateForStringList,
    [ParseNodeType.List]: this.unimplementedNode,
    [ParseNodeType.Set]: this.unimplementedNode,
    [ParseNodeType.Name]: this.unimplementedNode,
    [ParseNodeType.Call]: this.unimplementedNode,
    [ParseNodeType.Index]: this.evaluateForIndex,
    [ParseNodeType.Tuple]: this.evaluateForTuple,
    [ParseNodeType.Dictionary]: this.evaluateForDictionary,
    // The only type of not expression node that we support is the parameter node.
    [ParseNodeType.Parameter]: this.evaluateForParameter,
  };

  public evaluate(tree: TreeNode, fillings: Map<number, Value>): Value {
    const evaluateFunction = this.createNodeFunctions[tree.nodeType];
    if (!evaluateFunction) {
      throw new Error(`This type of node '${tree.node.nodeType}' cannot be evaluated.`);
    }

    return evaluateFunction.call(this, tree, fillings);
  }

  private evaluateForParameter(node: ParameterTreeNode, fillings: Map<number, Value>): Value {
    if (fillings.has(node.node.id)) {
      return fillings.get(node.node.id)!;
    }
    if (node.defaultValue) {
      return this.evaluate(node.defaultValue, fillings);
    }
    throw new Error(`${getNodeText(node.node)}: No filling found for the parameter node`);
  }

  private evaluateForConstant(node: ConstantTreeNode): NoneValue {
    assert(
      node.node.constType === KeywordType.None,
      `Only support the constant node with value 'None'.`
    );
    return NoneValue.create();
  }

  private evaluateForIndex(node: IndexTreeNode, fillings: Map<number, Value>): EnvVarAccessValue {
    // Currently, we only support the environment variable access using the index node.
    if (node.flags && node.flags & TreeNodeFlags.AccessEnvVar) {
      const value = this.evaluate(node.items[0], fillings);
      if (!Value.isStringLiteral(value)) {
        throw new Error(`${getNodeText(node.node)}: Only support string literal access as index.`);
      }

      return EnvVarAccessValue.create(value.value as any);
    } else {
      throw new Error(`${getNodeText(node.node)}: Only support environment variable access.`);
    }
  }

  private evaluateForTuple(node: TupleTreeNode, fillings: Map<number, Value>): TupleValue {
    return TupleValue.create(node.items.map((item) => this.evaluate(item, fillings)));
  }

  private evaluateForDictionary(node: DictionaryTreeNode, fillings: Map<number, Value>): DictValue {
    const result: [Value, Value][] = [];
    for (const [key, value] of node.items) {
      result.push([this.evaluate(key, fillings), this.evaluate(value, fillings)]);
    }

    return DictValue.create(result);
  }

  private evaluateForStringList(
    node: StringListTreeNode,
    fillings: Map<number, Value>
  ): LiteralValue {
    const result = node.strings
      .map((str) => {
        const part = this.evaluate(str, fillings);
        if (!Value.isStringLiteral(part)) {
          throw new Error(`${getNodeText(str.node)}: Only support string literal in string list.`);
        }
        return part.value;
      })
      .join("");

    return LiteralValue.create(result);
  }

  private evaluateForString(node: StringTreeNode): LiteralValue {
    return LiteralValue.create(node.node.value);
  }

  private evaluateForFormatString(
    node: FormatStringTreeNode,
    fillings: Map<number, Value>
  ): LiteralValue {
    const fieldValues = node.fields.map((field) => this.evaluate(field, fillings));

    let result = "";
    let fieldIdx = 0;
    let middleIdx = 0;
    while (
      fieldIdx < node.node.fieldExpressions.length ||
      middleIdx < node.node.middleTokens.length
    ) {
      const isField =
        fieldIdx < node.node.fieldExpressions.length &&
        (middleIdx >= node.node.middleTokens.length ||
          node.node.fieldExpressions[fieldIdx].start < node.node.middleTokens[middleIdx].start);

      if (isField && !Value.isStringLiteral(fieldValues[fieldIdx])) {
        console.error(fieldValues[fieldIdx]);

        throw new Error(
          `${getNodeText(
            node.node
          )}: Only support string literal, not including the string returned by a function, in the format string.`
        );
      }

      result += isField
        ? (fieldValues[fieldIdx++] as LiteralValue).value
        : node.node.middleTokens[middleIdx++].escapedValue;
    }

    return LiteralValue.create(result);
  }

  private evaluateForBinaryOperation(
    node: BinaryOperationTreeNode,
    fillings: Map<number, Value>
  ): LiteralValue {
    const left = this.evaluate(node.left, fillings);
    const right = this.evaluate(node.right, fillings);

    if (left.valueType !== ValueType.Literal || right.valueType !== ValueType.Literal) {
      throw new Error(
        `${getNodeText(node.node)}: Only support literal values in binary operation.`
      );
    }

    if (
      (!Value.isNumberLiteral(left) && !Value.isStringLiteral(left)) ||
      (!Value.isNumberLiteral(right) && !Value.isStringLiteral(right))
    ) {
      throw new Error(
        `${getNodeText(node.node)}: Only support number or string literal in binary operation.`
      );
    }

    if (typeof left.value !== typeof right.value) {
      throw new Error(
        `${getNodeText(
          node.node
        )}: The left and right values in binary operation must have the same type.`
      );
    }

    const leftValue = left.value as any;
    const rightValue = right.value as any;

    let result: any;
    switch (node.node.operator) {
      case OperatorType.Add:
        result = leftValue + rightValue;
        break;
      case OperatorType.Subtract:
        result = leftValue - rightValue;
        break;
      case OperatorType.Multiply:
        result = leftValue * rightValue;
        break;
      case OperatorType.Divide:
        result = leftValue / rightValue;
        break;
      default:
        throw new Error(
          `The operator '${node.node.operator}' is not supported yet. If you need this feature, please submit an issue.`
        );
    }

    return LiteralValue.create(result);
  }

  private unimplementedNode(node: TreeNode): never {
    throw new Error(
      `The evaluation of node type '${node.nodeType}' is not implemented yet. If you need this feature, please submit an issue.`
    );
  }
}

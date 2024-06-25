import assert from "assert";
import { ParseNodeType } from "pyright-internal/dist/parser/parseNodes";
import { ClassType, TypeCategory } from "pyright-internal/dist/analyzer/types";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { KeywordType, OperatorType } from "pyright-internal/dist/parser/tokenizerTypes";
import {
  BinaryOperationTreeNode,
  CallTreeNode,
  ConstantTreeNode,
  DictionaryTreeNode,
  FormatStringTreeNode,
  IndexTreeNode,
  NumberTreeNode,
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
  DataClassValue,
} from "./value-types";
import { Fillings } from "./value-evaluator";
import { TreeBuilder } from "./value-tree-builder";

type EvaluateFunction<T extends TreeNodeBase> = (node: T, fillings: Fillings) => Value;

export class TreeEvaluator {
  constructor(
    private readonly typeEvaluator: TypeEvaluator,
    private readonly treeBuilder: TreeBuilder
  ) {}

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
    [ParseNodeType.Number]: this.evaluatorForNumber,
    [ParseNodeType.String]: this.evaluateForString,
    [ParseNodeType.FormatString]: this.evaluateForFormatString,
    [ParseNodeType.StringList]: this.evaluateForStringList,
    [ParseNodeType.List]: this.unimplementedNode,
    [ParseNodeType.Set]: this.unimplementedNode,
    [ParseNodeType.Name]: this.unimplementedNode,
    [ParseNodeType.Call]: this.evaluateForCall,
    [ParseNodeType.Index]: this.evaluateForIndex,
    [ParseNodeType.Tuple]: this.evaluateForTuple,
    [ParseNodeType.Dictionary]: this.evaluateForDictionary,
    // The only type of not expression node that we support is the parameter node.
    [ParseNodeType.Parameter]: this.evaluateForParameter,
  };

  public evaluate(tree: TreeNode, fillings: Fillings): Value {
    const evaluateFunction = this.createNodeFunctions[tree.nodeType];
    if (!evaluateFunction) {
      throw new Error(`This type of node '${tree.node.nodeType}' cannot be evaluated.`);
    }

    return evaluateFunction.call(this, tree, fillings);
  }

  private evaluateForParameter(node: ParameterTreeNode, fillings: Fillings): Value {
    if (fillings.has(node.node.id)) {
      return fillings.get(node.node.id)!;
    }
    if (node.defaultValue) {
      return this.evaluate(node.defaultValue, fillings);
    }
    throw new Error(`${getNodeText(node.node)}: No filling found for the parameter node`);
  }

  private evaluateForConstant(node: ConstantTreeNode): NoneValue | LiteralValue {
    switch (node.node.constType) {
      case KeywordType.None:
        return NoneValue.create();
      case KeywordType.True:
        return LiteralValue.create(true);
      case KeywordType.False:
        return LiteralValue.create(false);
      default:
        throw new Error(`The constant type '${node.node.constType}' is not supported yet.`);
    }
  }

  private evaluateForIndex(node: IndexTreeNode, fillings: Fillings): EnvVarAccessValue {
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

  private evaluateForTuple(node: TupleTreeNode, fillings: Fillings): TupleValue {
    return TupleValue.create(node.items.map((item) => this.evaluate(item, fillings)));
  }

  private evaluateForDictionary(node: DictionaryTreeNode, fillings: Fillings): DictValue {
    const result: [Value, Value][] = [];
    for (const [key, value] of node.items) {
      result.push([this.evaluate(key, fillings), this.evaluate(value, fillings)]);
    }

    return DictValue.create(result);
  }

  private evaluateForStringList(node: StringListTreeNode, fillings: Fillings): LiteralValue {
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

  private evaluateForFormatString(node: FormatStringTreeNode, fillings: Fillings): LiteralValue {
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
        // prettier-ignore
        throw new Error(
          `${getNodeText(node.node)}: Only support string literal, not including the string returned by a function, in the format string.`
        );
      }

      result += isField
        ? (fieldValues[fieldIdx++] as LiteralValue).value
        : node.node.middleTokens[middleIdx++].escapedValue;
    }

    return LiteralValue.create(result);
  }

  private evaluateForCall(node: CallTreeNode, fillings: Fillings) {
    if (node.flags && node.flags & TreeNodeFlags.AccessEnvVar) {
      // This expression is an environment variable access.
      const envVarName = this.evaluate(node.args[0], fillings);
      if (!Value.isStringLiteral(envVarName)) {
        throw new Error(`${getNodeText(node.node)}: Only support string literal access as index.`);
      }

      const defaultValue = node.args[1] ? this.evaluate(node.args[1], fillings) : undefined;
      if (defaultValue && !Value.isStringLiteral(defaultValue)) {
        throw new Error(
          `${getNodeText(
            node.node
          )}: Only support string literal as default value in environment variable access.`
        );
      }

      return EnvVarAccessValue.create(envVarName.value as any, defaultValue?.value as any);
    }

    if (node.dataclass) {
      const type = this.typeEvaluator.getType(node.node);
      assert(type && type.category === TypeCategory.Class, "The type of the node is not a class.");

      const values: Record<string, Value> = {};

      // If the data class has default values, we evaluate the default values first.
      const entries = ClassType.getDataClassEntries(type);
      entries.forEach((entry) => {
        if (entry.hasDefault) {
          const name = entry.name;
          const tree = this.treeBuilder.createNode(entry.defaultValueExpression!);
          values[name] = this.evaluate(tree, fillings);
        }
      });

      // Then we evaluate the values of the arguments passed to the constructor.
      node.node.arguments.forEach((arg, idx) => {
        const name = arg.name?.value ?? entries[idx].name;
        values[name] = this.evaluate(node.args[idx], fillings);
      });

      return DataClassValue.create(type.details.fullName, values);
    }

    throw new Error(
      `${getNodeText(node.node)}: Only support environment variable access and data class.`
    );
  }

  private evaluatorForNumber(node: NumberTreeNode) {
    return LiteralValue.create(node.node.value);
  }

  private evaluateForBinaryOperation(
    node: BinaryOperationTreeNode,
    fillings: Fillings
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

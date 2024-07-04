import assert from "assert";
import { Writable } from "stream";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { ArgumentNode, ExpressionNode, ParseNode } from "pyright-internal/dist/parser/parseNodes";
import { Value } from "./value-types";
import { TreeBuilder } from "./value-tree-builder";
import { TreeEvaluator } from "./value-tree-evaluator";
import { TreeNodeFlags, listDependencies } from "./value-tree-types";

export type Fillings = ReadonlyMap<number, ArgumentNode>;

/**
 * Value evaluator is used to evaluate the value of the given expression node with the fillings.
 */
export interface ValueEvaluator {
  /**
   * Get all the placeholders in the value tree of the given root node.
   *
   * @param root The root node of the value tree.
   * @returns An array of nodes representing the placeholders in the value tree.
   */
  getPlaceholders(root: ExpressionNode): ParseNode[];

  /**
   * Evaluate the value of the given root node with the fillings.
   *
   * @param root The root node of the value tree.
   * @param fillings A map of fillings where the keys represent the id of placeholders and the
   * values represent the fillings.
   * @returns The evaluated value of the root node.
   */
  evaluate(root: ExpressionNode, fillings?: Fillings): Value;

  /**
   * Print the value tree of the given root node.
   *
   * @param root The root node of the value tree.
   */
  printValueTree: (root: ExpressionNode, log?: Writable) => void;
}

export function createValueEvaluator(typeEvaluator: TypeEvaluator): ValueEvaluator {
  return new valueEvaluator(typeEvaluator);
}

/**
 * This is the implementation of the value evaluator. When evaluating the value of an expression
 * node, it will first build a value tree from the expression node, which each node in the tree
 * represents a expression that can be evaluated. And the value of each node is the value of the
 * expression. The value of the root node can be evaluated by evaluating the values of its
 * dependencies.
 */
class valueEvaluator implements ValueEvaluator {
  private readonly treeBuilder: TreeBuilder;
  private readonly treeEvaluator: TreeEvaluator;

  constructor(readonly typeEvaluator: TypeEvaluator) {
    this.treeBuilder = new TreeBuilder(typeEvaluator);
    this.treeEvaluator = new TreeEvaluator(typeEvaluator, this.treeBuilder);
  }

  public printValueTree(root: ExpressionNode, log?: Writable) {
    log = log || process.stdout;

    const tree = this.treeBuilder.createNode(root);
    const que = [tree];
    while (que.length > 0) {
      const node = que.shift();
      assert(node !== undefined, `Node should not be undefined.`);

      log.write(node.print() + "\n");

      const deps = listDependencies(node);
      deps.forEach((dep) => que.push(dep));
    }
  }

  public getPlaceholders(root: ExpressionNode) {
    const placeholderNodes: Map<number, ParseNode> = new Map();

    const tree = this.treeBuilder.createNode(root);
    const que = [tree];
    while (que.length > 0) {
      const node = que.shift();
      assert(node !== undefined, `Node should not be undefined.`);
      if (node.flags && node.flags & TreeNodeFlags.Placeholder) {
        placeholderNodes.set(node.node.id, node.node);
      }

      const deps = listDependencies(node);
      deps.forEach((dep) => que.push(dep));
    }

    return Array.from(placeholderNodes.values());
  }

  public evaluate(root: ExpressionNode, fillings?: Fillings) {
    const tree = this.treeBuilder.createNode(root);
    return this.treeEvaluator.evaluate(tree, fillings ?? new Map());
  }
}

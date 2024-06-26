---
"@plutolang/pyright-deducer": patch
---

feat(deducer): replace value evaluator with new versio

The new ValueEvaluator is designed to build an expression tree first and then evaluate it with the given parameters, enabling the support for local variable computations.

The expression tree, referred to as ValueTree in the code, is a hierarchical structure where each node represents an expression, not including nodes like function definitions. By evaluating the expressions, we can obtain the values of the nodes. Since an expression may depend on other expressions, calculating a node's value requires recursively computing the values of the dependent nodes.

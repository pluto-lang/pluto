---
"@plutolang/graphviz-generator": patch
"@plutolang/base": patch
---

fix: resolve topo sort failure by adding missing resource edge

The topological sort was wrong due to a missing edge related to the resource argument. This commit adds the required edge to ensure correct sorting order.

---
"@plutolang/simulator-adapter": patch
"@plutolang/static-generator": patch
"@plutolang/base": patch
---

feat(base): add type attribute to topology sort results

The topology sort previously returned a list of Entity instances, including Resource, Closure, and Relationship types. Processing these required type-checking each entity via attribute comparison, which was cumbersome and error-prone.

This commit introduces a 'type' attribute to the topology sort's output, distinguishing between 'resource', 'bundle', and 'relationship'. This enhancement simplifies entity processing and increases code safety.

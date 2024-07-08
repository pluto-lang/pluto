---
"@plutolang/pyright-deducer": patch
---

feat(deducer): add custom function support for infrastructure ops

Implement the ability for users to define custom functions to reuse infrastructure operations. This includes constructing the function object and executing associated API calls.

However, users are currently restricted to invoking only infrastructure API calls within the custom function. They're unable to call other functions, such as client APIs or regular functions, nor can they return values from the custom function.

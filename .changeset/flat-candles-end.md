---
"@plutolang/static-deducer": patch
---

feat(deducer): use the `name` parameter from the new expression as the resource object name

Previously, the resource object's name was derived from the resource variable name, causing discrepancies between compilation and runtime. This update utilizes the `name` parameter from the new expression for naming the resource object during compilation, defaulting to `default` when not provided.

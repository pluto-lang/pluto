---
"@plutolang/pluto-infra": patch
"@plutolang/pluto": patch
---

feat(sdk): move name option to separate argument in Function constructor

Moved the `name` option from the `options` argument to a separate `name` argument in the `Function` constructor. This change allows the deducer to correctly identify the name of the `Function` resource object.

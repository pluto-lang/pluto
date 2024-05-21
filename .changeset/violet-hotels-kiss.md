---
"@plutolang/pyright-deducer": patch
---

fix(deducer): fix missed extraction of environment variables for functions, lambdas, and classes

Missed the extraction of environment variables when accessed inside the body of functions, lambdas, and classes. This fix addresses the issue by checking the dependent environment variables, during searching the outside variables used within these node types.

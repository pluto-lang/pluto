---
"@plutolang/graphviz-generator": patch
---

fix(generator): fix lost connection line between constructor call and closure

This commit addresses the issue where there was a missing link between the resource constructor call and the closure it created, leading to unexpected behaviors in the generator functionality.

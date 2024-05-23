---
"@plutolang/pyright-deducer": patch
---

fix(deducer): replace slash with underscore in variable names

When a resource name contains a slash, it incorrectly appears in the variable name, violating naming conventions. This commit addresses the problem by substituting slashes with underscores in variable names. Additionally, it ensures the removal of leading slashes and digits from variable names.

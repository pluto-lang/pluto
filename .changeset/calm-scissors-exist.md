---
"@plutolang/pyright-deducer": patch
---

feat(deducer): support extracting format string in Python

Previously, when the pyright deducer encountered a StringList node, it would only extract the string directly. However, for format strings that depend on variables, this approach was insufficient. This update allows the deducer to extract both the format string and its associated variables from the node.

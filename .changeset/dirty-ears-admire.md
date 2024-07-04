---
"@plutolang/pyright-deducer": patch
---

feat(deducer): support to extract the code segment for a paramter

Enhance CodeExtractor to handle parameters by retrieving associated arguments from provided fillings. It now extracts code segments for these arguments and replaces the parameter's code segment accordingly.

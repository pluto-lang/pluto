---
"@plutolang/pyright-deducer": patch
---

feat(deducer): enable recursive local module imports

Previously, the pyright deducer would only bundle modules imported in main.py. With this commit, it now recursively searches and bundles all local modules.

---
"@plutolang/pyright-deducer": patch
---

fix(deducer): fix package installation with mismatched module names

Previously, the pyright deducer used the imported module name for package installation, causing failures for modules like `faiss`, which is imported as `faiss` but the package name is `faiss-cpu`.

Now, it will search all dist-info directories, constructing package information from metadata and top-level.txt files. This establishes the relationship between installed package names and imported module names, resolving the installation issue.

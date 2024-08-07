---
"@plutolang/pyright-deducer": patch
---

fix(deducer): use package name from dist-info instead of import name

The package import name may differ from its actual package name. For instance, `pysqlite3-binary` is the package name, but it is imported as `pysqlite3`. This mismatch can cause the loss of required packages at runtime.

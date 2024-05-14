---
"@plutolang/pyright-deducer": patch
---

feat(deducer): support more situations for resource constructor and infra api args

This update enhances the deducer module by allowing environment variables and variables to be passed to resource constructors and infra API arguments. Specifically, it now supports:

- Direct literal values (e.g., `1`, `true`, `"hello"`).
- Direct dataclass constructors (e.g., `Model(name="hello")` where `Model` is a dataclass).
- Direct access to environment variables (e.g., `os.environ["key"]`, `os.environ.get("key", "default")`).
- Variables (e.g., `var1`, `var2`), with the requirement that they are defined exactly once and assigned with the supported value types.
- Tuples or dicts containing the supported types of values.

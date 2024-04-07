---
"@plutolang/pyright-deducer": patch
---

feat(deducer): support extracting dependent code from binary operations and list comprehensions

Binary operations and list comprehensions are common in Python code. LangChain uses binary operations as its LCEL. Therefore, it's important to support extracting the dependent code from binary operations and list comprehensions.

The process of extracting binary operations and list comprehensions is similar to extracting other nodes. It involves recursively extracting child expressions, using the source code as the extracted code, and adding the dependent declarations of the child expressions to the extraction result.

There's another small tweak in the code. We've added the `uselessFilesPatterns` option to the `bundleModules` function, enabling to define which file patterns to delete during module bundling. By default, `.pyc`, `__pycache__`, and `dist-info` files will be deleted. However, LangChain requires the `pydantic` metadata files within the `dist-info` directory. Therefore, we now specify the `uselessFilesPatterns` option for `.pyc` and `__pycache__` only.

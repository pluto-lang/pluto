---
"@plutolang/pyright-deducer": patch
---

fix(deducer): resolve deducer malfunction with imports in function body

The deducer fails to operate correctly when encountering import statements inside function bodies, attempting to retrieve module symbols from these local scope imports. Since global scope is required for symbol resolution and these imports don't need extraction, the solution is to bypass import statements during the extraction process.

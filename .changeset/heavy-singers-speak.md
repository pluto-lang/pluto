---
"@plutolang/pyright-deducer": patch
---

fix(deducer): ensure consistent parameter order between Python and TypeScript

The use of a named parameter list in the Python deducer code led to inconsistencies with the TypeScript IaC code parameter order. This change aligns the parameter orders across both languages to ensure consistency and avoid potential confusion or errors due to mismatched parameters.

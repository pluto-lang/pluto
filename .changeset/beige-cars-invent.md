---
"@plutolang/simulator-adapter": patch
---

fix(adapter): correct parsing error for complex JSON values

The current implementation uses `eval` to parse values that may include `process.env`. However, `eval` throws errors when parsing complex JSON structures. This commit resolves the issue by creating a string that assigns the value to a variable and subsequently returns the variable, which `eval` can then parse without errors.

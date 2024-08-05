---
"@plutolang/cli": patch
---

fix(cli): replace `table` with `cli-table3` for better Unicode support

Switched to `cli-table3` as it provides enhanced support for Unicode characters, which was lacking in the `table` package.

---
"@plutolang/pluto-infra": patch
---

fix(sdk): correct `express` dependency classification

This commit addresses an error where `express` was incorrectly included in dev-dependencies instead of dependencies.

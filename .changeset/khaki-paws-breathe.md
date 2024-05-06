---
"@plutolang/pyright-deducer": patch
---

fix: skip dependency installation even if the last install failed

Previously, the installation process overlooked the `done` flag in the metadata, causing it to skip installing dependencies even if the last attempt failed, as long as the dependencies were the same as those previously identified.

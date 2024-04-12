---
"@plutolang/pyright-deducer": patch
"@plutolang/pluto-infra": patch
---

feat(deducer): expand support for python runtimes

Recognizing that the Python runtime on a developer's device may not always be 'python3.10', we have extended our support to include a broader range of Python runtimes. The updated requirements now stipulate that the Python runtime should be 'python3.8' or higher, but not exceeding 'python3.12'.

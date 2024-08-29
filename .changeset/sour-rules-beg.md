---
"@plutolang/pyright-deducer": patch
"@plutolang/cli": patch
---

feat(deducer): configure local arch for pluto run on Mac

Avoid unnecessary use of Docker for x86 pypi package downloads when executing pluto run on Mac. Previously, target architecture was set to x86 for all environments, leading to Docker usage on Mac. This change sets the target architecture to the local one during pluto run execution.

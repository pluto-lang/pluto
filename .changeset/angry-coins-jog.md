---
"@plutolang/pyright-deducer": patch
"@plutolang/pluto-infra": patch
---

feat(deducer): enable relative imports for local modules

Users can now perform relative imports of local modules within the app directory. The Pyright deducer has been updated to copy these modules to the root of each bundle directory for seamless integration.

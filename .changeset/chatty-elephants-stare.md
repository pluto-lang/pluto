---
"@plutolang/pluto-infra": patch
"@plutolang/pluto": patch
---

feat(sdk): include the `raw` option in the Function constructor

Add the `raw` option to the Function constructor. When set to `true`, it ensures the function doesn't wrap the adapter provided by the SDK developer, allowing raw data from the platform to be sent directly to the function handler.

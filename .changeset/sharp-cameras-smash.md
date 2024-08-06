---
"@plutolang/pluto-infra": patch
---

feat(sdk): optimize cold-start performance

Move import statements to container initialization to enhance runtime performance.

By shifting import statements to container initialization rather than at invocation time, we ensure that the import process is completed with more resources available, leading to improved cold-start performance.

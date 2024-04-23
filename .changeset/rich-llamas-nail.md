---
"@plutolang/pluto-infra": patch
"@plutolang/pluto": patch
---

feat(sdk): add bucket resource type, modify the schedule, function resource type

- Bucket resource type added, currently only supports AWS S3.
- Schedule resource type adapted for Python, enabling periodic tasks such as rebuilding the vector store for RAG applications.
- Function resource type now includes a `memory` option to specify instance memory size.

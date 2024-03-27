---
"@plutolang/pyright-deducer": patch
---

feat: using `pip install` to bundle dependencies instead of copying local packages

When creating the Lambda deployment package, it's essential to bundle dependencies. Previously, we built the dependency graph for a single closure, identified the directories containing the dependent packages, and copied them into the deployment package. However, this approach struggles with cross-architecture deployment and may include unnecessary files.

Now, we utilize `pip install` to install directly dependent packages for a closure. If the target runtime or architecture differs from the local environment, we employ Docker to handle dependency installation before packaging. While this method offers greater reliability, it's slower compared to the previous approach.

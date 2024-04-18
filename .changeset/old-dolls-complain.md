---
"@plutolang/pluto-infra": patch
---

fix(sdk): pulumi serialization issue with pluto-info package

Deploying the pluto application on Kubernetes works locally, but fails in container environments where packages are fetched from the npm registry instead of being built locally. This failure is due to pulumi not serializing the imported package correctly. In the dev environment, serialization includes all imported package code, but in containers, it only generates a require statement, causing the application to fail.

To resolve this, I adapted a serialization method that was previously implemented for Python, creating an adapter file for each resource. Then, wrapping functions from the business layer to the adapter, then to the base runtime function, in sequence. These files are then bundled according to dependency hierarchy into a directory, from which an image is built and deployed to Kubernetes.

---
"@plutolang/pyright-deducer": patch
---

fix(deducer): correct environment variable access code format

The code generation for environment variable access within the infrastructure code, which is written in TypeScript, was incorrectly producing Python format. This change ensures the code is now generated in the proper TypeScript format, resolving the error.

---
"@plutolang/pyright-deducer": patch
"@plutolang/simulator-adapter": patch
"@plutolang/base": patch
"@plutolang/cli": patch
---

feat(deducer): add support for custom runtime adapter

Add functionality to handle a custom adapter in the stack configuration.

When the 'provision type' option is set to 'Custom', users are now prompted to enter the name of their adapter package. Once supplied, it is included in the project's configuration, enabling the use of a bespoke adapter.

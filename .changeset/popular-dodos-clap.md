---
"@plutolang/pyright-deducer": patch
---

feat(deducer): fix the name of extracted bundle

Previously, the name of the extracted bundle was determined by the entrypoint's position in the source code, leading to frequent changes and unnecessary reinstallation of dependent packages. This process was both time-consuming and network-intensive. Now, the naming convention relies on the associated resource's name, method name, and the name and index of the parameter corresponding to the bundle's entrypoint, enhancing stability.

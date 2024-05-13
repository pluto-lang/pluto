---
"@plutolang/graphviz-generator": patch
---

feat(generator): default to from-resource's ID when to-resources is empty

- The generator will now use the 'from-resource' ID as a fallback when the 'to-resources' field is left empty.
- Also, changed the output format from SVG to PNG.

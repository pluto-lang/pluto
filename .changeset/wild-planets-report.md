---
"@plutolang/pyright-deducer": patch
---

fix(deducer): avoid retrieving declarations for non-infrastructure call nodes

Previously, the deducer attempted to retrieve all call node declarations and match them against custom infrastructure functions. This method was flawed as functions with multiple declarations caused the deducer to fail. To address this, we now first verify that a call node pertains to a custom infrastructure function by comparing function names. Only then do we fetch the call node's declaration, effectively bypassing the collection of extraneous call node declarations.

---
"@plutolang/pyright-deducer": patch
---

fix(deducer): correct package directory resolution and METADATA parsing

This commit addresses two separate issues identified in the deducer:

- The deducer incorrectly searched for distribution information within the stub type directory, which lacks the required dist info. The resolution has been updated to check for the presence of `nonStubImportResult` within the `ImportResult`. If present, it is now utilized to determine the correct package directory.
- The parsing of the `dist-info/METADATA` file was flawed due to the possibility of encountering multiple `Name` lines. The parser has been adjusted to only consider lines that begin with `Name:` and are not preceded by any spaces.

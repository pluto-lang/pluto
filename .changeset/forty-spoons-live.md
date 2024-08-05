---
"@plutolang/base": patch
---

feat: update resource ID generation to handle Unicode characters

The resource ID generation logic has been updated in both Python and TypeScript files to handle Unicode characters. This ensures that Unicode characters are properly encoded in the resource ID string, preventing any issues with special characters. The `encode_unicode` function has been added to both files to handle the encoding. This improvement enhances the reliability and compatibility of the resource ID generation process.

---
"@plutolang/pyright-deducer": patch
---

fix(deducer): correct exportName setting for multiline export statements

This commit addresses an issue where errors occur when setting the exportName for export statements that contain line breaks. The issue arises particularly when the export statement is a function call, lambda expression, or similar, and spans multiple lines.

Previously, the strategy was to assign the last line of the statement to the exportName, which proved to be incorrect for multiline statements. This commit changes that approach to assign the entire statement to the exportName, if the statement spans multiple lines.

Consider the following function call, where the second argument is the statement we want to export:

```python
router.all("/*", lambda *args, **kwargs: Mangum(return_fastapi_app(),
                                                api_gateway_base_path="/dev")(*args, **kwargs), raw=True)
```

Before this fix, the assignment would look like this:

```python
lambda *args, **kwargs: Mangum(return_fastapi_app(),
exportName                                                api_gateway_base_path="/dev")(*args, **kwargs)
```

After this fix, the assignment is as follows:

```python
exportName = lambda *args, **kwargs: Mangum(return_fastapi_app(),
                                                api_gateway_base_path="/dev")(*args, **kwargs)
```

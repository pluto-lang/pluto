---
"@plutolang/pluto-infra": patch
---

fix(infra): parse JSON body correctly

Previously, failure to parse the JSON body led to user code errors. Now, if the 'Content-Type' header is 'application/json', the body is parsed as JSON before passing it to user code.

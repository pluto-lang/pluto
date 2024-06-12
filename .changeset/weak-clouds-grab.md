---
"@plutolang/cli": patch
---

fix(cli): fix that lost dotfiles in published package

The npm pack command excludes dotfiles by default. This commit introduces a postinstall script to rename .gitignore to gitignore, applying the same renaming strategy to other dotfiles.

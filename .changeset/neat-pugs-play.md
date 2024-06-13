---
"@plutolang/cli": patch
---

fix(ci): prevent modification of dotfiles during release

The dotfiles necessary for creating new Pluto app projects are stored without the leading dot and are modified when the CLI package is installed.

Due to the repository being a monorepo managed by pnpm, executing `pnpm install` triggers the postinstall script, altering the dotfiles. Consequently, the released package fails to include the dotfiles.

This commit resolves the issue by bypassing the postinstall script during CI package installation when the `RELEASE` environment variable is present.

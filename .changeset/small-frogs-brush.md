---
"@plutolang/simulator-adapter": patch
"@plutolang/pulumi-adapter": patch
"@plutolang/pluto-infra": patch
"@plutolang/base": patch
"@plutolang/cli": patch
---

Feature: refactor Pluto's output management

Refactor Pluto's output management by introducing a dedicated directory for the adapter to maintain its state. Migrate all state-related configurations, including lastArchRefFile, from the existing configuration file to this new state directory.

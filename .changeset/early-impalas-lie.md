---
"@plutolang/cli": patch
---

feat(cli): add .env file support for environment variables

CLI commands now support loading environment variables from .env files. This feature simplifies configuring different environments without needing to change the codebase.

Pluto CLI will load the `.env` files in a specific order. Test environment files are loaded only with the `test` command. And the local environment files are usually ignored by git:

1. `.env` - The default file.
2. `.env.local` - Local overrides, loaded in all environments for local development.
3. `.env.test` - Overrides for the test environment.
4. `.env.test.local` - Local overrides for the test environment.
5. `.env.${stack}` - Environment-specific overrides, loaded for the specified stack, like `.env.aws` for the stack named `aws`.
6. `.env.${stack}.local` - Local overrides for a specific stack.
7. `.env.${stack}.test` - Test environment overrides for a specific stack.
8. `.env.${stack}.test.local` - Local test environment overrides for a specific stack.

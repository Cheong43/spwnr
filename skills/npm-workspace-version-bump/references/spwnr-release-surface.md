# Spwnr Release Surface

Use this reference when a version bump needs to line up with Spwnr's npm publish workflow.

## Versioned files

- `package.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `apps/spwnr-cli/package.json`
- `packages/adapters/package.json`
- `packages/broker/package.json`
- `packages/core-types/package.json`
- `packages/injector/package.json`
- `packages/manifest-schema/package.json`
- `packages/memory/package.json`
- `packages/policy/package.json`
- `packages/registry/package.json`

## Public npm publish path

Read these files before assuming a package will be published:

- `.github/workflows/publish-npm.yml`
- `scripts/publish-public-packages.mjs`

At the time this skill was created, the publish script releases:

- `@spwnr/core-types`
- `@spwnr/adapters`
- `@spwnr/manifest-schema`
- `@spwnr/injector`
- `@spwnr/cli`

`@spwnr/registry` is published from `Cheong43/spwnr-registry`, not from this main repo workflow.

The `vendor/spwnr-registry` submodule is a separate template registry package and should not publish over the runtime `@spwnr/registry` package name.

`@spwnr/broker`, `@spwnr/memory`, and `@spwnr/policy` may still be version-aligned in the repo even if they are not part of the current npm publish script.

## Common failure modes

- GitHub Actions passes but nothing new appears on npm because the target version is already published.
- `pnpm install --frozen-lockfile` fails because package metadata drifted from `pnpm-lock.yaml`.
- Trusted Publisher is configured correctly, but the workflow never actually reaches a real `pnpm publish` because the script skips all packages as already published.

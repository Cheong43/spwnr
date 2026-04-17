---
name: npm-workspace-version-bump
description: Bump package versions for the Spwnr pnpm monorepo, or a similar workspace-based npm release flow, while keeping root metadata, plugin metadata, workspace package manifests, publish targets, and release verification aligned. Use when Codex needs to prepare a new npm release version, explain why a successful publish workflow did not actually publish, or synchronize package.json version fields before rerunning CI or npm publishing.
---

# Npm Workspace Version Bump

Use this skill to move a repo from one release version to another without leaving publish metadata out of sync.

For Spwnr, the version bump is broader than the public npm packages. The repo root and Claude plugin metadata usually move with the workspace packages, while the actual npm publish surface is defined separately by the publish workflow and script.

## Workflow

1. Read [`references/spwnr-release-surface.md`](./references/spwnr-release-surface.md) and inspect the current publish path in `.github/workflows/publish-npm.yml` plus `scripts/publish-public-packages.mjs`.
2. Confirm which packages are only repo-internal versus actually published to npm. Do not assume every workspace package is published just because it has a version.
3. Run `node skills/npm-workspace-version-bump/scripts/bump_spwnr_versions.mjs <x.y.z>` from the repo root to update the root package, plugin metadata, and workspace package manifests together.
4. Inspect the diff and check whether any additional version-bearing files outside the scripted set also need alignment.
5. Run verification in this order when the user wants a release-ready bump:
   - `pnpm install --frozen-lockfile`
   - `pnpm build`
   - `pnpm test`
6. If `pnpm install --frozen-lockfile` fails, treat that as metadata drift. Update the lockfile only when the package specifiers truly changed; do not jump straight to `--no-frozen-lockfile` as the default fix.
7. Before concluding that npm publish is broken, check whether the target version already exists on npm. The Spwnr publish script intentionally skips versions that are already published, and the workflow can still finish green in that case.

## Commands

Use the bump script for deterministic edits:

```bash
node skills/npm-workspace-version-bump/scripts/bump_spwnr_versions.mjs 0.3.0
```

Preview changes without writing files:

```bash
node skills/npm-workspace-version-bump/scripts/bump_spwnr_versions.mjs 0.3.0 --dry-run
```

## Guardrails

- Keep the requested semver exact. Do not invent prerelease tags or patch bumps.
- Prefer bumping all tracked Spwnr workspace versions together unless the user explicitly wants a split strategy.
- Distinguish clearly between "workflow succeeded" and "new version was published". A green GitHub Actions job is not proof that npm received a new release.
- If publish behavior looks surprising, read the publish script before changing the workflow.
- If the repo depends on Trusted Publisher, preserve `id-token: write` and `--provenance` unless the user explicitly wants a different release model.

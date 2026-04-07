# Orchex

Orchex is a pnpm monorepo for a cross-runtime subagent platform. It now includes the core layers needed for an MVP execution loop:

- shared subagent protocol and runtime types
- manifest loading and package layout validation
- local package registry with tarball publish/install flow
- runtime broker and backend selection
- adapter layer for `simulated`, `opencode`, and `claude_code`
- policy merging and host policy mapping helpers
- run, checkpoint, artifact, and agent memory stores
- a CLI for validate, publish, inspect, install, and run workflows

The product and architecture direction live in [Orchex-PRD-AND-TDD.md](./Orchex-PRD-AND-TDD.md). A more task-focused walkthrough is available in [docs/guide/getting-started.md](./docs/guide/getting-started.md).

## Workspace Layout

```text
apps/
  orchex-cli/           CLI entry point and command handlers
packages/
  adapters/             backend adapters and adapter registry
  broker/               runtime broker, retry strategy, backend selection
  core-types/           shared protocol, enums, and error types
  manifest-schema/      manifest parsing and package validation
  memory/               run/checkpoint/artifact/memory persistence
  policy/               policy merge and host-mapping helpers
  registry/             local registry, tarballs, package metadata
examples/
  code-reviewer/        example subagent package
docs/
  guide/                usage walkthroughs
  superpowers/specs/    design notes
```

## Requirements

- Node.js 22+
- pnpm 9+

## Install

```bash
pnpm install
```

## Common Commands

```bash
pnpm build
pnpm test
```

Current test status in this branch: `220` tests across `32` test files are passing with `pnpm test`.

## What Works Today

Implemented:

- validate a package from `subagent.yaml` or `subagent.json`
- verify package layout for schemas, workflows, and local skill paths
- publish package metadata and tarballs into a local SQLite-backed registry
- inspect published package versions with `list` and `info`
- install published package contents into the local Orchex home
- execute published packages through the runtime broker
- persist run state, checkpoints, artifacts, and agent memory in the memory layer
- select or simulate backends for local testing

Still early / incomplete:

- remote registry distribution
- production-grade host integrations
- rich policy enforcement during execution
- `--watch` mode on the CLI `run` command
- polished packaging for all workspace packages outside the monorepo context

## CLI Commands

When working inside this monorepo, prefer invoking the CLI through the workspace script:

```bash
pnpm --filter @orchex/cli dev -- --help
```

The CLI currently exposes these commands:

```text
validate <dir>          Validate a subagent package directory
publish <dir>           Publish a subagent package to the local registry
install <name> [ver]    Install a subagent package from the local registry
list|ls                 List published subagent packages in the local registry
info <name> [ver]       Show details about a subagent package
run <name> [ver]        Run a published subagent package
```

The `run` command supports:

- `--input <json>` to pass structured input
- `--backend <type>` to request a backend
- `--watch` is present but not implemented yet

Available backends in the current codebase:

- `simulated`
- `opencode`
- `claude_code`

## Local Storage

By default Orchex stores data under `~/.orchex`:

- registry DB: `~/.orchex/sqlite/orchex.db`
- tarballs: `~/.orchex/tarballs/<name>/<version>.tar.gz`
- installed packages: `~/.orchex/packages/<name>/<version>`
- run data: `~/.orchex/runs/` and the run-memory SQLite store

Override the root location with `ORCHEX_HOME`:

```bash
ORCHEX_HOME=/tmp/orchex-demo pnpm --filter @orchex/cli dev -- list
```

## Example Package

The bundled sample package lives at `examples/code-reviewer`:

```text
examples/code-reviewer/
  subagent.yaml
  prompts/system.md
  workflow/main.yaml
  schemas/
    input.schema.json
    output.schema.json
    memory.schema.json
  skills/
    diff-reader/SKILL.md
    repo-navigator/SKILL.md
```

Its manifest demonstrates:

- metadata and semantic versioning
- workflow entry definition
- local skill references
- tool allow/ask/deny hints
- compatibility targets
- memory schema declaration
- artifact declarations
- model binding metadata

## Typical Dev Flow

1. Install dependencies:

```bash
pnpm install
```

2. Run the test suite:

```bash
pnpm test
```

3. Validate the example package:

```bash
pnpm --filter @orchex/cli dev -- validate examples/code-reviewer --strict
```

4. Publish it into an isolated local registry:

```bash
ORCHEX_HOME=/tmp/orchex-demo pnpm --filter @orchex/cli dev -- publish examples/code-reviewer
```

5. Inspect what was published:

```bash
ORCHEX_HOME=/tmp/orchex-demo pnpm --filter @orchex/cli dev -- list
ORCHEX_HOME=/tmp/orchex-demo pnpm --filter @orchex/cli dev -- info code-reviewer
```

6. Run it with the simulated backend:

```bash
ORCHEX_HOME=/tmp/orchex-demo pnpm --filter @orchex/cli dev -- run code-reviewer --backend simulated --input '{}'
```

## Notes On Current Runtime Packaging

Inside the monorepo, the source and tests are healthy, and `pnpm build` succeeds for the packages that currently emit `dist/`. However, some workspace packages are still exported directly from `src/`, so the repository is best treated as a workspace-first development environment right now rather than a polished packaged release.

## Next Reading

- [Getting Started](./docs/guide/getting-started.md)
- [PRD and TDD](./Orchex-PRD-AND-TDD.md)
- [M1/M2 design notes](./docs/superpowers/specs/2026-04-07-orchex-m1-m2-design.md)
- [M3/M4/M5 design notes](./docs/superpowers/specs/2026-04-07-orchex-m3-m4-m5-design.md)

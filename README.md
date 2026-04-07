# Orchex

Orchex is an early-stage monorepo for a cross-runtime subagent platform. It currently includes:

- shared protocol and manifest types
- manifest loading and package layout validation
- a local SQLite-backed package registry
- a small CLI for validating, publishing, listing, inspecting, and installing subagent packages

The product direction is documented in [Orchex-PRD-AND-TDD.md](./Orchex-PRD-AND-TDD.md). The codebase today is closer to an MVP registry/tooling foundation than a full runtime broker.

## Workspace Layout

```text
apps/
  orchex-cli/           CLI entry point
packages/
  core-types/           shared protocol, enums, and error types
  manifest-schema/      manifest parsing and layout validation
  registry/             local registry, tarball storage, install flow
examples/
  code-reviewer/        sample subagent package
docs/
  superpowers/specs/    design notes
```

## Requirements

- Node.js 22+
- pnpm 9+

This repo uses a pnpm workspace and TypeScript project references.

## Install

```bash
pnpm install
```

## Common Commands

```bash
pnpm build
pnpm test
```

## CLI Usage

Build the workspace first:

```bash
pnpm build
```

Then run the compiled CLI:

```bash
node apps/orchex-cli/dist/cli.js --help
```

Available commands:

```text
validate [options] <dir>  Validate a subagent package directory
publish <dir>             Publish a subagent package to the local registry
install <name> [version]  Install a subagent package from the local registry
list|ls                   List published package versions in the local registry
info <name> [version]     Show details about a subagent package
```

### Registry Storage

By default, Orchex stores its local registry under `~/.orchex`:

- SQLite DB: `~/.orchex/sqlite/orchex.db`
- tarballs: `~/.orchex/tarballs/<name>/<version>.tar.gz`
- installed packages: `~/.orchex/packages/<name>/<version>`

Override this location with `ORCHEX_HOME`:

```bash
ORCHEX_HOME=/tmp/orchex-demo node apps/orchex-cli/dist/cli.js list
```

## Quickstart With The Example Package

Validate the bundled example:

```bash
node apps/orchex-cli/dist/cli.js validate examples/code-reviewer --strict
```

Publish it into an isolated local registry:

```bash
ORCHEX_HOME=/tmp/orchex-demo node apps/orchex-cli/dist/cli.js publish examples/code-reviewer
```

Inspect what was published:

```bash
ORCHEX_HOME=/tmp/orchex-demo node apps/orchex-cli/dist/cli.js list
ORCHEX_HOME=/tmp/orchex-demo node apps/orchex-cli/dist/cli.js info code-reviewer
```

Install the package from the local registry:

```bash
ORCHEX_HOME=/tmp/orchex-demo node apps/orchex-cli/dist/cli.js install code-reviewer
```

## Example Package Shape

The sample package at `examples/code-reviewer` shows the current expected layout:

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

Its manifest defines:

- package metadata and compatibility targets
- input and output JSON schemas
- a workflow entrypoint
- skill references
- tool and permission policy hints
- optional memory and model binding metadata

## Current Scope

Implemented today:

- manifest parsing from `subagent.yaml` or `subagent.json`
- schema-level manifest validation with Zod
- package layout checks for schemas, workflow files, and local skill paths
- local package publish/install via tarballs
- package metadata storage in SQLite

Not implemented yet:

- remote registry distribution
- runtime broker execution
- host adapters
- policy enforcement at execution time
- run orchestration, checkpoints, or observability pipelines

## Notes

- The bundled tests are currently green with `pnpm test`.
- The CLI is intentionally local-first right now; publishing means writing to the local registry, not to a remote service.

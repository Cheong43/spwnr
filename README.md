# Spwnr

Spwnr is a pnpm monorepo for packaging and declaratively injecting agent capabilities into host-native runtimes such as Claude Code, Codex, Copilot, and OpenCode.

Spwnr does not run agents for the host. It owns package definition, validation, publishing, installation, static injection, and session descriptor composition. Scheduling and execution stay inside the host itself.

The current direction is documented in [docs/archive/Spwnr-PRD-AND-TDD.md](./docs/archive/Spwnr-PRD-AND-TDD.md). A usage walkthrough lives in [docs/guide/getting-started.md](./docs/guide/getting-started.md).

## Community Registry

Spwnr now treats [`vendor/spwnr-registry`](./vendor/spwnr-registry) as the community template registry source. The nested repository is the canonical place for:

- template source packages under `templates/<name>/<version>/`
- pull-request based contribution review
- registry index generation via `registry-index.json`
- GitHub Pages publishing for the official template marketplace

This repository keeps a lightweight portal that mirrors the submodule snapshot and links users to the official registry site.

Initialize the nested repository after cloning:

```bash
git submodule update --init --recursive
```

## What Spwnr Includes

- agent-first subagent manifest types and validation
- local registry with publish, resolve, install, list, and info flows
- host adapters that compile a shared package manifest into host-native assets
- an injector layer for static file materialization and session descriptor composition
- a CLI for `validate`, `publish`, `install`, `list`, `info`, `inject`, and `session`

Deprecated internal runtime packages still exist in the repo for future experiments, but they are not part of the current product surface.

## Workspace Layout

```text
apps/
  spwnr-cli/            CLI entry point and command handlers
packages/
  adapters/             host adapters for Claude Code, Codex, Copilot, OpenCode
  broker/               deprecated internal runtime seed
  core-types/           shared manifest, host, and error types
  injector/             static injection and session composition
  manifest-schema/      manifest parsing and package validation
  memory/               deprecated internal runtime seed
  policy/               dormant policy extension interfaces
  registry/             local registry, tarballs, package metadata
examples/
  code-reviewer/        example agent package
  general-*/            workflow worker subagent examples
docs/
  guide/                usage walkthroughs
  archive/              archived design notes
```

## Requirements

- Node.js 22+
- pnpm 9+

## Install And Verify

```bash
pnpm install
pnpm build
pnpm test
```

Run `pnpm test` after changes to verify the workspace and repo-level workflow smoke tests.

If you plan to use the repo-root Claude Code workflow plugin with multi-agent `team` mode or `swarm` mode, enable Claude Code agent teams before installation or use:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Without this setting, `/spwnr:task` can still plan and run `single-lane`, but it must report `team` and `swarm` as unavailable.

## Repo Claude Plugin

This repository now also carries a repo-root Claude Code plugin for dogfooding a plan-first Claude-native orchestration workflow:

- plugin root: [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json)
- commands: [`commands/`](./commands)
- hooks: [`hooks/`](./hooks)
- skills: [`skills/`](./skills)

The plugin is not a published Spwnr package. It is a repository-local workflow asset that plans first with `Skill`, `AskUserQuestion`, `TodoWrite`, `Read`, `Write`, and `Edit`, persists an executable plan artifact as the latest active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` (for example `.claude/plans/spwnr-demo-2026-04-11-r2.md` after a material re-plan), runs a review loop after each plan write, and then only after the current run receives `Execute current plan` reads that active revision, appends `Approved Execution Spec`, resolves a best-fit agent lineup plus per-unit coverage from the local Spwnr registry with `resolve-workers`, and orchestrates the selected agents through `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `Agent`, `TeamCreate`, `SendMessage`, `EnterWorktree`, `ExitWorktree`, and `TeamDelete`. `/spwnr:workers` remains the deeper audit entrypoint for registry health, vendored sync gaps, installation or injection recovery, and injected agents.

When installed in Claude Code, the slash commands are:

- `/spwnr:plan`
- `/spwnr:task`
- `/spwnr:workers`

Claude Code team features are required for multi-agent `team` and `swarm` orchestration, so make sure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in the shell or environment that launches Claude Code.

For non-trivial work, start with planning:

- `/spwnr:plan` aligns the goal, success criteria, boundaries, risks, and review-loop condition, writes the detailed plan to revision 1 at `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md`, or to `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` when a material re-plan creates a new revision, upgrades `Detailed Plan` into orchestration-ready `Execution Units`, records `Plan Review Loop`, and then immediately asks whether to `Execute current plan`, `Continue improving plan`, or `End this round`. Minor revisions update the same active revision; material re-plans supersede the older revision and create the next one.
- `/spwnr:task` reuses the same planning gate, resolves the latest active revision, validates that executable `Execution Units` exist, asks for the same current-run execution choice when needed, appends `Approved Execution Spec`, resolves both a global candidate pool and per-unit coverage, creates a fresh task graph from that active revision, and only delegates after `Execute current plan`. It keeps `single-lane` as the default, uses `team` for queue-driven multi-agent execution with explicit ownership boundaries, requires `EnterWorktree` / `ExitWorktree` for `swarm` writes, and leaves superseded-plan tasks visible for audit only.
- `/spwnr:workers` checks whether the dynamic worker policy, local registry, vendored template sync, and current Claude agent state are healthy enough to support registry-backed selection, and acts as the required recovery entrypoint when `/spwnr:task` cannot form a usable lineup.

## CLI Surface

Inside this monorepo, the easiest way to invoke the CLI is:

```bash
pnpm --filter @spwnr/cli dev -- --help
```

Commands:

```text
validate <dir>          Validate an agent package directory
publish <dir>           Publish an agent package to the local registry
install <name> [ver]    Install a package from the local registry into SPWNR_HOME
list|ls                 List published agent packages in the local registry
info <name> [ver]       Show package details and host injection support
inject <name> [ver]     Materialize host-native static assets
session <name> [ver]    Compose a host session descriptor or shell snippet
resolve-workers         Build a dynamic agent candidate pool from the local registry
sync-registry [dir]     Publish vendored/community templates into the local registry
run <name> [ver]        Deprecated; use inject/session instead
```

## Injection Modes

Spwnr supports two injection paths:

- Static injection: write host-native assets into project-level or user-level directories.
- Session composition: emit a descriptor or shell snippet that a host can consume for the current session.

Current host mapping:

- `claude_code`
  Static: `.claude/agents/*.md` or `~/.claude/agents/*.md`
  Session: JSON bundle compatible with `claude --agents`
- `copilot`
  Static: `.github/agents/*.agent.md` or `~/.copilot/agents/*.agent.md`
  Session: temporary profile descriptor or shell snippet
- `opencode`
  Static: `.opencode/agents/*.md` or `~/.config/opencode/agents/*.md`
  Session: overlay or descriptor output
- `codex`
  Static: `.codex/agents/*.toml`
  Session: preview-only descriptor output

## Local Storage

By default Spwnr stores registry data under `~/.spwnr`:

- registry DB: `~/.spwnr/sqlite/spwnr.db`
- tarballs: `~/.spwnr/tarballs/<name>/<version>.tar.gz`
- installed packages: `~/.spwnr/packages/<name>/<version>`

Override the root location with `SPWNR_HOME`:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- list
```

Spwnr does not provide compatibility fallbacks for older names or older home directories.

## Example Packages

The bundled sample package lives at `examples/code-reviewer`:

```text
examples/code-reviewer/
  subagent.yaml
  agent.md
  schemas/            # optional
    input.schema.json
    output.schema.json
    memory.schema.json
  skills/
    universal/
      diff-reader/SKILL.md
      repo-navigator/SKILL.md
    claude_code/
      diff-reader/SKILL.md
    codex/
      diff-reader/SKILL.md
```

Its manifest demonstrates:

- `metadata.instruction` as the short retrieval summary
- `spec.agent.path` as the primary prompt entry
- optional `spec.schemas`
- `spec.injection.hosts` for host-specific static and session support
- layered `spec.skills` with universal and host-specific skill variants
- host-specific tool binding notes written directly in each `SKILL.md`
- compatibility targets
- metadata authors and project links
- structured package dependency declarations
- memory schema declaration
- artifact declarations
- model binding metadata

Additional workflow-oriented agent examples now live under:

- `examples/general-researcher`
- `examples/general-executor`
- `examples/general-reviewer`

## Typical Flow

1. Validate the example package:

```bash
pnpm --filter @spwnr/cli dev -- validate examples/code-reviewer --strict
```

2. Publish it into an isolated local registry:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- publish examples/code-reviewer
```

3. Inspect the published package and host matrix:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- info code-reviewer
```

4. Inject it into a host:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- inject code-reviewer --host claude_code --scope project
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- inject code-reviewer --host codex --scope project
```

5. Compose a session descriptor when you want temporary injection:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- session code-reviewer --host claude_code --format json
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- session code-reviewer --host copilot --format shell
```

## Notes

- `install` remains available for extracting package contents into the local Spwnr home, but injection is now the main consumer path.
- `packages/policy` is intentionally dormant in the current product path and only exposes future-facing extension interfaces.
- `packages/broker` and `packages/memory` remain in the repo as deprecated internal seeds and are not wired into the main CLI flow.

## Next Reading

- [Getting Started](./docs/guide/getting-started.md)
- [Claude Plugin Workflow](./docs/guide/claude-plugin-workflow.md)
- [Archived PRD and TDD](./docs/archive/Spwnr-PRD-AND-TDD.md)

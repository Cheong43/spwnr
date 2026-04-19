<p align="center">
  <img src="./docs/assets/spwnr.png" alt="Spwnr logo" width="720" />
</p>

Spwnr is an open-source toolkit for packaging, injecting, and orchestrating multi-agent workers across coding hosts. Currently supporting Claude Code.

## Claude Code Quick Start

```bash
# Claude Code plugin install
/plugin marketplace add Cheong43/spwnr
/plugin install spwnr@spwnr
/reload-plugins
# spwnr cli install
npm i @spwnr/cli

# Edit Claude Code config on .Claude/setting.json
"env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": 1
}
# Or Edit the env
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

then activate the following skill commands in your agent
```bash
/using-spwnr # Main router: /spwnr-plan -> /spwnr-task -> implement
/spwnr-do # Directly handle a bounded small task with optional 1-3 workers
/spwnr-plan # Write plan
/spwnr-task # Route and execute the approved plan in pipeline/team mode
/spwnr-worker-audit # Check subagent template availability and recovery steps
```

A usage walkthrough lives in [docs/guide/getting-started.md](./docs/guide/getting-started.md).

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

If you plan to use the repo-root Claude Code workflow plugin with multi-agent `team` mode, enable Claude Code agent teams before installation or use:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Without this setting, `/spwnr-task` can still run `pipeline`, but it must report `team` as unavailable.

## Repo Claude Plugin

This repository now also carries a repo-root Claude Code plugin for dogfooding a plan-first Claude-native orchestration workflow:

- plugin root: [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json)
- hooks: [`hooks/`](./hooks)
- skills: [`skills/`](./skills)

The plugin is not a published Spwnr package. It is a repository-local workflow asset whose command surface lives entirely under `skills/`. `/using-spwnr` is the main router and should default to `/spwnr-plan`, then `/spwnr-task`, then implement. `/spwnr-do` handles bounded small tasks directly with `Skill`, `Read`, `Write`, `Edit`, `Agent`, and `resolve-workers`, writes a lightweight note under `.claude/do/spwnr-do-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<slug>.md`, caps direct worker selection at 1-3, and redirects to `/spwnr-worker-audit` or `/spwnr-plan` instead of improvising when the fit is wrong. The heavier lane plans first with `Skill`, `AskUserQuestion`, `TodoWrite`, `Read`, `Write`, and `Edit`, persists an executable plan artifact as the latest active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` (for example `.claude/plans/spwnr-demo-2026-04-11-r2.md` after a material re-plan), runs a planning-time expert loop with `resolve-workers` plus planning-only `Agent` passes for `research -> draft -> review`, records the outcome in `Expert Planning Round`, requires planning to choose `pipeline` or `team` plus the execution pattern, and then only after the current run receives `Execute current plan` reads that active revision, appends `Approved Execution Spec`, resolves a best-fit agent lineup plus per-unit coverage from the local Spwnr registry with `resolve-workers`, and routes execution through `skills/spwnr-task/task-pipeline.md` or `skills/spwnr-task/task-team.md`. If planning-time registry lookup cannot form that expert set, `/spwnr-plan` stops with `Worker Readiness Required` and routes the user to `/spwnr-worker-audit`. These workflows are for general tasks such as research, analysis, writing, operations, and coding, not only software implementation.

When installed in Claude Code, the slash commands are:

- `/using-spwnr`
- `/spwnr-do`
- `/spwnr-plan`
- `/spwnr-task`
- `/spwnr-worker-audit`

Claude Code team features are required only for `team` orchestration, so make sure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in the shell or environment that launches Claude Code when the approved plan needs team fanout or parallel pipelines.

Use the router based on task size:

- `/using-spwnr` is the main entry router and should default to `/spwnr-plan`, then `/spwnr-task`, then implement. It may still point to `/spwnr-do` for bounded work or `/spwnr-worker-audit` for readiness recovery.
- `/spwnr-do` handles a bounded small task directly, writes a lightweight note under `.claude/do/`, may invoke at most 3 direct workers, and redirects to `/spwnr-plan` when the task becomes broad, multi-stage, risky, or planning-sensitive.
- `/spwnr-plan` aligns the goal, success criteria, boundaries, risks, and review-loop condition, writes the detailed plan to revision 1 at `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md`, or to `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` when a material re-plan creates a new revision, upgrades `Detailed Plan` into orchestration-ready `Execution Units`, requires `Execution Strategy Recommendation` to choose `pipeline` or `team`, records the execution pattern, runs a planning-time expert sequence `research -> draft -> review` by previewing templates with `resolve-workers` and deriving planning-only experts with `Agent`, records the outcome in `Expert Planning Round` and `Plan Review Loop`, and then immediately asks whether to `Execute current plan`, `Continue improving plan`, or `End this round`. Minor revisions update the same active revision; material re-plans supersede the older revision and create the next one. If the planning expert loop cannot form a viable lineup, it stops with `Worker Readiness Required` and sends the user to `/spwnr-worker-audit` before any execution handoff.
- `/spwnr-task` reuses the same planning gate, resolves the latest active revision, validates that executable `Execution Units` exist, asks for the same current-run execution choice when needed, appends `Approved Execution Spec`, resolves both a global candidate pool and per-unit coverage, and only delegates after `Execute current plan`. It acts as a router: `pipeline` plans go to `skills/spwnr-task/task-pipeline.md`, while `team` plans go to `skills/spwnr-task/task-team.md`. `pipeline` works without Claude team features. `team` may launch multiple pipelines in parallel when the approved plan says so. Superseded-plan tasks remain visible for audit only.
- `/spwnr-worker-audit` checks whether the dynamic worker policy, local registry, vendored template sync, and current Claude agent state are healthy enough to support registry-backed selection, and acts as the required recovery entrypoint when `/spwnr-task` cannot form a usable lineup. If `.claude-plugin/workers.json` is missing, the built-in default dynamic policy still applies.

## CLI Surface

Use the published `spwnr` CLI for normal workflows:

```bash
spwnr --help
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
SPWNR_HOME=/tmp/spwnr-demo spwnr list
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
spwnr validate examples/code-reviewer --strict
```

2. Publish it into an isolated local registry:

```bash
SPWNR_HOME=/tmp/spwnr-demo spwnr publish examples/code-reviewer
```

3. Inspect the published package and host matrix:

```bash
SPWNR_HOME=/tmp/spwnr-demo spwnr info code-reviewer
```

4. Inject it into a host:

```bash
SPWNR_HOME=/tmp/spwnr-demo spwnr inject code-reviewer --host claude_code --scope project
SPWNR_HOME=/tmp/spwnr-demo spwnr inject code-reviewer --host codex --scope project
```

5. Compose a session descriptor when you want temporary injection:

```bash
SPWNR_HOME=/tmp/spwnr-demo spwnr session code-reviewer --host claude_code --format json
SPWNR_HOME=/tmp/spwnr-demo spwnr session code-reviewer --host copilot --format shell
```

## Notes

- `install` remains available for extracting package contents into the local Spwnr home, but injection is now the main consumer path.
- `packages/policy` is intentionally dormant in the current product path and only exposes future-facing extension interfaces.
- `packages/broker` and `packages/memory` remain in the repo as deprecated internal seeds and are not wired into the main CLI flow.

## Next Reading

- [Getting Started](./docs/guide/getting-started.md)
- [Claude Plugin Workflow](./docs/guide/claude-plugin-workflow.md)

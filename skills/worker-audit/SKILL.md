---
name: worker-audit
description: Use for /spwnr:workers. Inspect registry readiness and current Claude agent availability for general-task workflows.
---

# Worker Audit

Use this skill to audit whether the Spwnr registry can dynamically resolve a usable agent lineup from the local registry.

This skill is the shared source of truth for dynamic registry readiness plus install or inject guidance.

It is a health-check and recovery surface, not a prerequisite step for `/spwnr:task`, which performs its own registry resolution during normal execution.

## Required Checks

1. Read `.claude-plugin/workers.json` with `Read`.
2. Confirm the worker policy is in dynamic mode.
3. Check project-scoped agents under `.claude/agents/`.
4. Check user-scoped agents under `~/.claude/agents/`.
5. Determine whether `spwnr` is available directly.
6. If `spwnr` is not available directly, tell the user to install the published `spwnr-cli` package before continuing. Do not redirect them to local development commands.
7. Check whether `vendor/spwnr-registry` exists in the current repository.
8. Inspect the local Spwnr registry and determine whether published packages exist at all, and whether dynamic resolution is likely usable.

## Dynamic Readiness Rules

- Treat the local Spwnr registry as the runtime source of truth.
- Do not assume vendored templates are usable until they have been synced into the local registry.
- Report already-injected project and user agents as current availability, not as the selection source of truth.
- If the vendored registry exists but the local registry looks sparse or empty, call out that `sync-registry` is likely needed.
- If `/spwnr:task` reported a registry gap, frame this command as the required recovery step before the task should continue.
- Do not silently invent a fallback agent lineup.

## Reporting Format

Use these sections:

1. `Worker Policy`
2. `Local Registry`
3. `Injected Agents`
4. `Readiness Gaps`
5. `Install Suggestions`
6. `Recommended Next Step`

## Install Suggestions

When the local registry is missing usable packages, prefer these exact commands:

- sync vendored community templates into the local registry
  - `spwnr sync-registry`
- preview registry candidates for a task
  - `spwnr resolve-workers --search "<search query>" --host claude_code --format json`

When a specific agent must be present immediately in Claude Code, prefer:

- user scope
  - `spwnr inject <name> --host claude_code --scope user`
- repo scope
  - `spwnr inject <name> --host claude_code --scope project`

## Rules

- Report whether dynamic selection is enabled and quote the key policy fields.
- Report whether the local registry has enough published packages to support a useful candidate pool.
- Report whether vendored registry content exists but still needs syncing.
- If all readiness conditions are satisfied, say that the registry audit path is healthy and remind the user that `/spwnr:task` can resolve its lineup directly.
- If `/spwnr:task` is blocked, explicitly say that the user should install or inject the missing agents first, then return to the same active revision and rerun `/spwnr:task`.
- If a task brief is explicitly provided, you may suggest using `resolve-workers` to preview likely candidates, but do not mutate state from this skill.

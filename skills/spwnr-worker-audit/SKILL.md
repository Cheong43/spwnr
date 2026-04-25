---
name: spwnr-worker-audit
description: Audit Spwnr worker readiness.
---

# Spwnr Worker Audit

Use this health-check and recovery surface only for registry/package/injected-agent readiness recovery. It is not a prerequisite for `/spwnr-task`; normal execution performs its own worker resolution first.

## Required Checks

Use targeted reads and directory checks:

1. Check `.claude-plugin/workers.json`; if absent, report the built-in dynamic defaults.
2. Check project agents under `.claude/agents/` and user agents under `~/.claude/agents/`.
3. Confirm `spwnr` is available directly; if not, recommend installing the published `spwnr-cli`.
4. Check `vendor/spwnr-registry` and the local registry state.
5. If a task brief was supplied, preview candidates with one concise `resolve-workers` query.

## Dynamic Readiness Rules

- Treat the local Spwnr registry as the runtime source of truth.
- Missing `.claude-plugin/workers.json` still means dynamic mode is active by default.
- Do not assume vendored templates are usable until synced into the local registry.
- Report already-injected project and user agents as current availability, not as the selection source of truth.
- If local registry content is sparse while vendored content exists, recommend `spwnr sync-registry`.
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

When local packages are missing, prefer install or inject guidance:

- `spwnr sync-registry`
- `spwnr resolve-workers --search "<search query>" --host claude_code --format json`

When a specific agent must be visible in Claude Code, prefer:

- `spwnr inject <name> --host claude_code --scope user`
- `spwnr inject <name> --host claude_code --scope project`

## Rules

- Report whether dynamic selection is enabled and quote the key policy fields.
- If `.claude-plugin/workers.json` is absent, say the defaults are `registrySource=local`, `selectionMethod=llm_choose`, `missingPolicy=auto_install_local`, and lineup `1-4`.
- Report whether the local registry has enough published packages to support a useful candidate pool.
- Report whether vendored registry content exists but still needs syncing.
- If healthy, say `/spwnr-task` can resolve directly.
- If blocked, list missing capabilities/packages and tell the user to install or inject missing agents, then return to the same active revision after recovery.
- Do not mutate state from this skill.

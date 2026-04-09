---
name: worker-audit
description: Use for /spwnr:workers. Inspect the worker map, Claude subagent availability, and exact install guidance.
---

# Worker Audit

Use this skill to audit which worker subagents are available to the workflow controller.

This skill is the single source of truth for worker resolution and install guidance.

## Required Checks

1. Read `.claude-plugin/workers.json`.
2. Check project-scoped agents under `.claude/agents/`.
3. Check user-scoped agents under `~/.claude/agents/`.
4. Determine whether `spwnr` is available directly.
5. If `spwnr` is not available directly, determine whether the workspace command `pnpm --filter @spwnr/cli dev --` is available.

## Worker Resolution

- For each role, try `preferredAgents` in order.
- Only use `fallbackAgents` when the preferred list is unavailable and the task still matches the fallback's specialty.

## Reporting Format

Use these sections:

1. `Worker Mapping`
2. `Available Agents`
3. `Missing Roles`
4. `Install Suggestions`
5. `Recommended Next Step`

## Install Suggestions

When a role is missing, prefer these exact commands:

- user scope
  - `spwnr inject <name> --host claude_code --scope user`
- repo scope from this repository
  - `pnpm --filter @spwnr/cli dev -- inject <name> --host claude_code --scope project`

## Rules

- Report both preferred and fallback workers for the `review` role.
- Mention whether each worker was found in project scope, user scope, or both.
- Do not silently replace a missing required worker.
- If all required workers are present, say that the workflow is ready and suggest `/spwnr:task`.

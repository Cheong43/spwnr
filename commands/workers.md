---
description: Inspect the Spwnr workflow worker map, current Claude subagent availability, and exact install guidance.
---

# Spwnr Workflow Workers

Use this command to audit which worker subagents are available to the workflow controller.

## Required Checks

1. Read `.claude-plugin/workers.json`.
2. Check project-scoped agents under `.claude/agents/`.
3. Check user-scoped agents under `~/.claude/agents/`.
4. Determine whether `spwnr` is available directly.
5. If `spwnr` is not available directly, determine whether the workspace command `pnpm --filter @spwnr/cli dev --` is available.

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
- If all required workers are present, say that the workflow is ready and suggest `/spwnr-workflow:task`.

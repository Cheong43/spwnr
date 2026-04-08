---
name: worker-selection
description: Resolve worker roles to installed Claude subagents using the repository worker map and visible .claude/agents directories.
---

# Worker Selection

Resolve workers in this order:

1. Read `.claude-plugin/workers.json`.
2. For each role, try `preferredAgents` in order.
3. Only use `fallbackAgents` when the preferred list is unavailable and the task still matches the fallback's specialty.

## Availability Checks

- Check project agents in `.claude/agents/`
- Check user agents in `~/.claude/agents/`
- Report where each worker was found

## Missing Worker Policy

- Do not silently replace a missing required worker.
- Tell the user which worker is missing.
- Suggest the exact `spwnr inject` command that would make it available.
- Mention the repo-local `pnpm --filter @spwnr/cli dev -- inject ...` form when working inside this repository.

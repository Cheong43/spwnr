---
description: Run the full Spwnr workflow with research, execution, review, and a final integrated answer.
---

# Spwnr Workflow Task

Use this command for non-trivial work that benefits from a controller plus worker subagents.

## Required Workflow

Always follow this sequence:

1. Clarify the goal, scope, constraints, and success criteria.
2. Inspect the repository or current context before asking the user anything.
3. Read `.claude-plugin/workers.json`.
4. Verify worker availability in project `.claude/agents/` and user `~/.claude/agents/`.
5. Stop immediately if any required role is unavailable.
6. Produce a short plan.
7. Delegate to the `research` worker.
8. Delegate to the `execute` worker.
9. Delegate to the `review` worker.
10. Integrate the results into the final response.

## Worker Selection

- `research` prefers `general-researcher`
- `execute` prefers `general-executor`
- `review` prefers `general-reviewer`
- `review` may fall back to `code-reviewer` only when the task is clearly code-centric

## Missing Worker Behavior

If a required role is missing, do not silently continue.

Return a short report with:

- the missing role
- the preferred worker package name
- whether the worker was missing from project scope, user scope, or both
- one or both of these exact suggestions when relevant:
  - `spwnr inject <name> --host claude_code --scope user`
  - `pnpm --filter @spwnr/cli dev -- inject <name> --host claude_code --scope project`

## Handoff Contracts

Require these sections from every worker:

- `research`
  - `findings`
  - `assumptions`
  - `recommendation`
  - `blockers`
- `execute`
  - `proposed result`
  - `rationale`
  - `unresolved risks`
- `review`
  - `pass-fail`
  - `issues`
  - `suggested fixes`
  - `residual risk`

## Final Response

Use these sections:

1. `Outcome`
2. `Process Summary`
3. `Risks Or Open Questions`
4. `Next Steps`

## Rules

- Do not skip the review stage.
- Do not let the reviewer invent new scope; it should judge the request and the current plan.
- If review finds blocking issues, route back through the execute step once, then finalize.
- Prefer the `using-spwnr-workflow`, `worker-selection`, `task-decomposition`, and `handoff-review` skills when useful.

---
name: workflow-task-orchestration
description: Use for /spwnr:task. Plan, verify workers, orchestrate research-execute-review, and synthesize the final answer.
---

# Workflow Task Orchestration

Use this skill for non-trivial work that benefits from a controller plus worker subagents.

This skill owns the full controller behavior for `/spwnr:task`.

Use `workflow-foundation` as the shared source of truth for context inspection, approach comparison, option-based clarification, and sensible defaults.
Use `worker-audit` as the shared source of truth for worker resolution and install guidance.

## Required Workflow

Always follow this sequence:

1. Clarify the goal, scope, constraints, and success criteria.
2. Inspect the repository or current context before asking the user anything.
3. Compare plausible ways to attack the task before locking the plan.
4. If a blocking clarification remains, present option-based decisions and a recommended default.
5. Read `.claude-plugin/workers.json`.
6. Verify worker availability in project `.claude/agents/` and user `~/.claude/agents/`.
7. Stop immediately if any required role is unavailable.
8. Produce a short plan.
9. Delegate to the `research` worker.
10. Delegate to the `execute` worker.
11. Delegate to the `review` worker.
12. Integrate the results into the final response.

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
- If review finds blocking issues, Route blocking review feedback back through the execute step once, then finalize.
- Keep task-specific control flow and worker output contracts here; do not duplicate shared controller rules from `workflow-foundation` or worker resolution rules from `worker-audit`.

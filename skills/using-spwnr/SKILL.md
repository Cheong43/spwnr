---
name: using-spwnr
description: Router for Spwnr commands.
---

# Using Spwnr

Use this skill as the lightweight router for `/using-spwnr`.

Spwnr is a controller. Load the target command skill before applying its workflow.

## Route

- Use `/spwnr-do` for bounded one-shot work that can finish in the current run.
- Use `/spwnr-plan` for non-trivial work that needs a durable plan.
- Use `/spwnr-task` only after the current run has approved the latest active plan.
- Use `/spwnr-worker-audit` for registry, package, or injected-agent readiness recovery.

Default non-trivial route: `/spwnr-plan` -> `/spwnr-task` -> implementation.

## Token-Sensitive Habits

- Prefer targeted reads and edits over full-file loops.
- Brief workers with the plan path, exact section names, concise goal, and expected delta.
- Do not pass full thread history or complete plan text to agents unless a section-level brief is insufficient.
- Route to `/spwnr-worker-audit` only after a real readiness or resolution gap.

## Quick Examples

- Broad coding or research request -> `/spwnr-plan`
- Approved plan and user asks to execute -> `/spwnr-task`
- Small follow-up fix -> `/spwnr-do`
- Missing local packages or agent readiness -> `/spwnr-worker-audit`

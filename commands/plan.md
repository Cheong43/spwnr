---
description: Clarify a task, inspect relevant context, and produce a short execution plan without delegating work.
---

# Spwnr Workflow Plan

Use this command when the user wants a scoped plan before any substantial execution.

## Goals

- Clarify the user goal, success criteria, constraints, and expected output.
- Inspect the repository or nearby context before asking clarifying questions.
- Produce a short plan that can be handed to workers later.
- Stop before delegation or implementation unless the user explicitly changes direction.

## Workflow

1. Restate the task in one or two sentences.
2. Inspect relevant files, docs, or project structure before asking questions.
3. Ask only blocking clarifications that cannot be resolved by inspection.
4. Write a compact plan with phases, notable risks, and the worker roles that would handle each phase.
5. Call out missing inputs or tradeoffs clearly.

## Output Format

Use short sections in this order:

1. `Goal`
2. `Constraints`
3. `Plan`
4. `Recommended Workers`

## Rules

- Do not delegate to subagents from this command.
- Do not implement changes from this command.
- If the user request is trivial, still return a short plan instead of immediately doing the work.
- Prefer the `task-decomposition` and `worker-selection` skills when they fit.

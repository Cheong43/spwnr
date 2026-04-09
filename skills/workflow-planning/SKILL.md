---
name: workflow-planning
description: Use for /spwnr:plan. Think through alternatives, recommend an approach, and produce a concrete plan plus option-based decisions.
---

# Workflow Planning

Use this skill when the user wants a scoped plan before substantial execution.

This skill owns the full planning behavior for `/spwnr:plan`.

Use `workflow-foundation` as the shared source of truth for context inspection, approach comparison, option-based clarification, and sensible defaults.

## Goals

- Clarify the goal, success criteria, constraints, and expected output.
- Produce a plan even when some decisions are still pending.
- Stop before delegation or implementation unless the user explicitly changes direction.

## Workflow

1. Restate the task in one or two sentences.
2. Inspect relevant files, docs, or project structure.
3. Compare plausible approaches and choose the recommended direction.
4. Draft a best-effort plan immediately instead of waiting for every detail to be decided.
5. Surface only the decisions that materially change the plan.
6. Write a compact plan with phases, notable risks, and the worker roles that would handle each phase.

## Output Format

Use short sections in this order:

1. `Goal`
2. `Situation Assessment`
3. `Approach Analysis`
4. `Constraints`
5. `Draft Plan`
6. `Decisions Needed`
7. `Recommended Workers`

Inside `Approach Analysis`, include:

- `Alternatives Considered`
- `Recommended Approach`
- `Why This Wins`

Inside `Decisions Needed`, format each unresolved choice like this:

- `Decision`
- `Recommended`
- `Options`

## Rules

- Do not delegate to worker subagents from this skill.
- Do not implement changes from this skill.
- If the request is simple, still provide a real plan instead of skipping straight to doing.
- Do not leave the plan blank with placeholders such as `—`.
- Keep planning-specific logic here; do not duplicate shared controller rules from `workflow-foundation`.

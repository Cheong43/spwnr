---
name: spwnr-task
description: Execute an approved Spwnr plan.
---

# Spwnr Task

Use this skill for `/spwnr-task`. It validates the latest active approved plan, appends an `Approved Execution Spec`, resolves workers, and routes to `task-pipeline.md` or `task-team.md`.

Use `spwnr-principle` for shared plan, task, approval, and readiness contracts. Use `spwnr-worker-audit` only after a concrete registry or capability resolution failure.

## Tool Protocol

- Use `Skill`, `AskUserQuestion`, `TodoWrite`, `Read`, `Write`, and targeted `Edit` while validating or maintaining the plan.
- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` only after `Execute current plan` is confirmed in the current run and the routed helper has taken over.
- Use `TeamCreate`, `SendMessage`, and `TeamDelete` only through `task-team.md`.
- Resolve workers with concise `spwnr resolve-workers --search "<brief>" --host claude_code --format json`; use repeatable `--unit "<unit-id>::<brief>"` only when per-unit coverage matters.

## Planning Gate

- Resolve the latest active revision first; if none exists, create revision 1 using `/spwnr-plan` conventions.
- If the current run has not received `Execute current plan`, stay in the execution review loop.
- Treat only the latest active revision as executable. Superseded revisions are audit-only.
- Keep the active plan path, approval condition, selected mode, blockers, and unit summary visible in `TodoWrite`.

## Token-Sensitive Validation

Read only the sections needed for the current check:

- `Metadata` and `Plan Review Loop` for active revision and approval state
- `Execution Strategy Recommendation` for selected mode and routing target
- `Agent Capability Requirements` plus `Execution Units` for worker coverage
- `Environment And Preconditions` and `Failure And Escalation Rules` for execution safety
- `Approved Execution Spec` only when checking whether it already exists or appending to it

Avoid re-reading or re-attaching the full plan after every edit. When briefing helpers or workers, pass concise unit/stage briefs plus the plan path and section names.

## Approved Execution Spec

Before any `TaskCreate`:

1. Confirm the plan has executable units, selected mode, capability requirements, and failure rules.
2. Produce a short plan summary, normalized registry lookup brief, and concise per-unit coverage brief for each unit.
3. Resolve the candidate pool and verify a lineup that covers every execution unit.
4. Read the selected execution pattern from the plan; do not invent it at execution time.
5. Validate `pipeline` pattern details or `team` queue/fanout shape as applicable.
6. In `team` mode, confirm concurrent tasks default to disjoint `Files:` ownership unless a shared-file exception is explicit.
7. Append `Approved Execution Spec` with selected mode, routing target, registry brief, and coverage summary.
8. Normalize `unit_id` markers. Prefer `- **unit_id**: unit-1`. Ensure each new task starts with `Blocked: no`.
9. For Claude mutating tasks, default to `Worktree: required`; discover `ToolSearchTool`, enter with `EnterWorktreeTool`, summarize with `BriefTool`, and exit with `ExitWorktreeTool`.

## Routing Decision

- Route `pipeline` plans to `skills/spwnr-task/task-pipeline.md`.
- Route `team` plans to `skills/spwnr-task/task-team.md`.
- Read only the selected helper.
- Do not silently downgrade `team` to `pipeline`.
- If lineup resolution fails, stop with the `Worker Readiness Required` shape from `spwnr-principle` and direct recovery to `/spwnr-worker-audit`.

## Worker Readiness Required

List missing capabilities or packages, tell the user to install or inject the missing agents, and resume from the same active revision after recovery.

## Rules

- Do not delegate before current-run approval.
- Do not mutate state during the planning gate.
- Do not execute against superseded revisions.
- Do not skip the review stage or let reviewers add scope.
- Treat the plan file, registry candidate pool, and per-unit coverage plan as the sources of truth.

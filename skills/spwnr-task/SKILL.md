---
name: spwnr-task
description: Use for /spwnr-task. Reuse the planning gate, require explicit execution approval, then route approved general-task work into pipeline or team execution helpers.
---

# Spwnr Task

Use this skill for non-trivial general work that benefits from a controller plus routed execution guidance.

This skill owns the routing behavior for `/spwnr-task`.

Use `spwnr-principle` as the shared source of truth for the planning gate, plan artifact conventions, execution task contract, risk-gated approvals, worker readiness required pattern, approach comparison, and sensible defaults.
Use `spwnr-worker-audit` only when the user explicitly needs a deeper registry readiness audit or the normal registry lookup path fails.
Use `task-pipeline.md` in this folder when the approved plan selects `pipeline`.
Use `task-team.md` in this folder when the approved plan selects `team`.

## Orchestration Tool Protocol

- Use `Skill`, `AskUserQuestion`, and `TodoWrite` for the planning gate, and keep the active plan revision updated on disk during plan maintenance.
- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` only after the current run explicitly approves execution and the routed helper document has taken over.
- Resolve registry candidates with `spwnr resolve-workers --search "<keyword>" --host claude_code --format json`, plus repeatable `--unit "<unit-id>::<brief>"` queries for per-unit coverage when the plan has multiple execution units.
- Use `TeamCreate`, `SendMessage`, and `TeamDelete` only when `task-team.md` requires Claude team features.

## Planning Gate

- Reuse the plan-first gate from `spwnr-principle` before any delegation.
- Resolve and read the latest active revision first; if it is missing, create revision 1 with the same structure used by `/spwnr-plan`.
- Keep goal, success criteria, scope boundaries, constraints, open risks, approval condition, current-run execution confirmation, plan artifact path, and executable `Execution Units` visible in `TodoWrite`.
- Treat only the latest active revision as executable. Superseded revisions and their tasks are audit-only.
- If the current run has not yet received `Execute current plan`, stay in the execution review loop instead of delegating.

## Approved Execution Spec

Before any `TaskCreate`:

1. Validate that the latest active revision contains executable `Execution Units`, `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, and `Failure And Escalation Rules`.
2. Produce a short plan summary, a normalized registry lookup brief, and one concise per-unit coverage brief for each execution unit.
3. Resolve the candidate pool from the local registry. If multiple units exist, use per-unit coverage to prove the lineup that covers every execution unit.
4. Read the selected mode and execution pattern from `Execution Strategy Recommendation` instead of inventing them at execution time.
5. If the selected mode is `pipeline`, validate that the pattern name, ordered stages, and stage handoffs are present.
6. If the selected mode is `team`, validate whether the plan expects one shared queue or multiple pipelines launched in parallel.
7. In `team` mode, default the task graph toward parallel tasks with disjoint `Files:` ownership. If the plan needs shared-file collaboration, validate that the exception is explicit and that the plan defines worktree isolation or one concrete owner for that file.
8. If `team` is required but `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is unavailable, stop and say so explicitly instead of silently downgrading.
9. Append `Approved Execution Spec` to the active revision, including the selected mode, routing target, normalized registry lookup brief, and per-unit coverage summary.

## Routing Decision

- Route to `task-pipeline.md` when the approved mode is `pipeline`.
- Route to `task-team.md` when the approved mode is `team`.
- Read the routed helper document and apply its execution contract before creating tasks.
- `pipeline` must remain available without Claude team features.
- `team` may launch multiple bounded pipelines in parallel when the approved plan says so.
- `team` should not default to multiple parallel tasks editing the same file unless the approved plan explicitly marks that as an exception.
- Do not silently reroute a `team` plan into `pipeline` when team prerequisites fail.

## Worker Readiness Required

If `/spwnr-task` cannot form a usable lineup, stop with these sections:

1. `Plan Artifact`
2. `Readiness Gap`
3. `Missing Capabilities`
4. `Recovery Steps`
5. `Next Step`

The recovery steps must list the missing capabilities or packages, tell the user to run `/spwnr-worker-audit`, tell them to install or inject the missing agents, and say that execution should resume from the same active revision after readiness is restored.

## Rules

- Do not delegate before the current run explicitly chooses `Execute current plan`.
- Do not mutate state from the planning phase of `/spwnr-task`.
- Do not keep executing against a superseded plan revision when a material re-plan has created a newer active revision.
- Do not skip the review stage.
- Do not let the reviewer invent new scope.
- Treat the plan file as the source of truth; later agents should not reconstruct it from chat alone.
- Treat the registry candidate pool and per-unit coverage plan as the source of truth for lineup selection.
- Tailor the output contract to the routed helper document's job.

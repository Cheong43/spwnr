---
name: workflow-task-orchestration
description: Use for /spwnr:task. Reuse the planning gate, require explicit execution approval, then orchestrate approved general-task work in single-lane, team, or swarm mode.
---

# Workflow Task Orchestration

Use this skill for non-trivial general work that benefits from a controller plus derived agents.

This skill owns the full controller behavior for `/spwnr:task`.

Use `workflow-foundation` as the shared source of truth for the planning gate, plan artifact conventions, execution task contract, risk-gated approvals, worker readiness required pattern, approach comparison, and sensible defaults.
Use `worker-audit` only when the user explicitly needs a deeper registry readiness audit or the normal registry lookup path fails.

## Orchestration Tool Protocol

- Use `Skill`, `AskUserQuestion`, `TodoWrite`, `Read`, `Write`, and `Edit` for the planning gate and plan maintenance.
- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` only after the current run explicitly approves execution.
- Resolve registry candidates with `spwnr resolve-workers --search "<keyword>" --host claude_code --format json`, plus repeatable `--unit "<unit-id>::<brief>"` queries for per-unit coverage when the plan has multiple execution units.
- Use `TeamCreate`, `SendMessage`, and `TeamDelete` only in `team` or `swarm` mode.
- Use `EnterWorktree` and `ExitWorktree` for `swarm` writes.

## Planning Gate

- Reuse the plan-first gate from `workflow-foundation` before any delegation.
- Resolve and read the latest active revision first; if it is missing, create revision 1 with the same structure used by `/spwnr:plan`.
- Keep goal, success criteria, scope boundaries, constraints, open risks, approval condition, current-run execution confirmation, plan artifact path, and executable `Execution Units` visible in `TodoWrite`.
- Treat only the latest active revision as executable. Superseded revisions and their tasks are audit-only.
- If the current run has not yet received `Execute current plan`, stay in the execution review loop instead of delegating.

## Approved Execution Spec

Before any `TaskCreate`:

1. Validate that the latest active revision contains executable `Execution Units`, `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, and `Failure And Escalation Rules`.
2. Produce a short plan summary, a normalized registry lookup brief, and one concise per-unit coverage brief for each execution unit.
3. Resolve the candidate pool from the local registry. If multiple units exist, use per-unit coverage to prove the lineup that covers every execution unit.
4. Choose the mode deliberately: default to `team` for bounded parallel units, `swarm` for coordinated shared-output passes, and `single-lane` only when the work is truly narrow or sequential.
5. If `team` or `swarm` is required but `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is unavailable, stop and say so explicitly instead of silently downgrading.
6. If `swarm` is selected and `EnterWorktree` fails, stop and ask the user whether to downgrade instead of silently switching modes.
7. Append `Approved Execution Spec` to the active revision with `Edit`.

## Execution Task Contract

Apply the shared Execution Task Contract, `### Compatibility Matrix`, `### TaskCreate Preflight`, and `Risk-Gated Units` from `workflow-foundation`.

- Every execution task, integration task, and review task must carry `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval`.
- Build a fresh task graph from the latest active revision; keep prior tasks from superseded revisions visible only for audit.
- Create one execution task per unit, plus integration and review tasks when the plan needs them.
- High-risk tasks must not complete while `Plan-Approval:` is still `required`.
- If `TaskCreate` fails, repair the plan artifact or task metadata first and never execute anyway.
- Do not bypass a failed `TaskCreate` by directly executing the work.

## Orchestration Spec

Before delegation, build an internal spec containing the plan artifact path, approved objective and success criteria, normalized registry lookup brief, candidate pool, per-unit coverage, selected lineup and why each package was chosen, latest active revision plus superseded audit references, execution mode, team topology, work packages, dependencies and merge points, agent briefs, final review scope, fallback policy, and risky-unit approval gates and file-ownership boundaries.

## Execution Mode Selection

- `single-lane`: use one primary worker when coordination overhead would exceed the benefit; add a second worker only when it materially improves validation or synthesis.
- `team`: use multiple bounded execution tasks, explicit ownership, and a shared queue; no-worktree multi-agent writes require explicit `Files:` boundaries.
- `swarm`: use 2 to 30 coordinated work packages that contribute to the same shared output, and require each writing agent to enter an isolated worktree before mutating repository state.
- Do not silently downgrade from `team` or `swarm` to `single-lane` when prerequisites fail.

## Failure Recovery Contract

Every selected agent brief must include this failure contract:

- if a permission denial, dependency gap, plan contradiction, or worktree failure appears, do not stop silently
- attempt one plan-consistent fallback when that fallback does not change scope
- if the issue remains, use `TaskUpdate` to mark the task blocked and explain why
- then use `SendMessage` to the lead with `failed tool`, `reason`, `attempted fallback`, `impact`, and `recommended next step`
- never mark the parent task complete while the issue is unresolved

When the run is `single-lane`, the controller must follow the same incident standard in the user-facing response and task updates.

## Worker Readiness Required

If `/spwnr:task` cannot form a usable lineup, stop with these sections:

1. `Plan Artifact`
2. `Readiness Gap`
3. `Missing Capabilities`
4. `Recovery Steps`
5. `Next Step`

The recovery steps must list the missing capabilities or packages, tell the user to run `/spwnr:workers`, tell them to install or inject the missing agents, and say that execution should resume from the same active revision after readiness is restored.

## Rules

- Do not delegate before the current run explicitly chooses `Execute current plan`.
- Do not mutate state from the planning phase of `/spwnr:task`.
- Do not keep executing against a superseded plan revision when a material re-plan has created a newer active revision.
- Do not skip the review stage.
- Do not let the reviewer invent new scope.
- Treat the plan file as the source of truth; later agents should not reconstruct it from chat alone.
- Treat the registry candidate pool and per-unit coverage plan as the source of truth for lineup selection.
- Tailor the output contract to the selected package's job.

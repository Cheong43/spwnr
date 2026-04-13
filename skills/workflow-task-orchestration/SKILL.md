---
name: workflow-task-orchestration
description: Use for /spwnr:task. Reuse the planning gate, require explicit execution approval, then orchestrate approved general-task work in single-lane, team, or swarm mode.
---

# Workflow Task Orchestration

Use this skill for non-trivial general work that benefits from a controller plus derived agents.

This skill owns the full controller behavior for `/spwnr:task`.

Use `workflow-foundation` as the shared source of truth for context inspection, approach comparison, option-based clarification, and sensible defaults.
Use `worker-audit` only when the user explicitly needs a deeper registry readiness audit or the normal registry lookup path fails.

## Orchestration Rule Set

- use `Skill`, `AskUserQuestion`, `TodoWrite`, `Read`, `Write`, and `Edit` for the planning gate
- after approval, create and track execution tasks with `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate`
- resolve candidate agents from the local Spwnr registry with `spwnr resolve-workers --search "<keyword>" --host claude_code --format json`
- resolve a per-unit coverage plan with repeatable `--unit "<unit-id>::<brief>"` queries when the plan contains multiple execution units
- choose a best-fit lineup from that candidate pool instead of reusing any fixed three-role template
- create teams with `TeamCreate`, steer teammates with `SendMessage`, and always clean up with `TeamDelete`
- derive only the selected registry-backed agents with `Agent`
- use `EnterWorktree` and `ExitWorktree` for `swarm` execution that writes repository state
- treat `/spwnr:workers` as a health check and recovery path, not as a prerequisite command for `/spwnr:task`

## Planning Gate

Start with the same planning gate standards used by `/spwnr:plan`.

Before any delegation, the controller must lock:

- goal
- success criteria
- scope boundaries
- constraints
- open risks
- approval condition
- current-run execution confirmation
- plan artifact path
- executable `Execution Units`

Track these readiness fields in `TodoWrite` while the plan is still being refined.
Track the plan artifact path at the same time so the later orchestration pass can read the same file.

If the current run has not yet received `Execute current plan`, keep the work in the review loop until the user explicitly chooses execution.
Do not delegate agents, do not imply approval, and do not drift into execution just because the plan looks plausible.
Treat only the latest active revision as executable. Superseded revisions and their tasks remain audit-only.

## Required Workflow

Follow the workflow in these phases. Treat `team` or `swarm` as the default execution path for approved work. Use `single-lane` only when the plan is truly narrow, sequential, or cannot justify team overhead.

### Phase 1: Normalize and Inspect

1. Clarify and normalize the goal, scope, constraints, success criteria, and decision context.
2. Inspect the repository or current context before asking the user anything.
3. Load `workflow-foundation` and `workflow-task-orchestration` with `Skill`.
4. Compare plausible approaches before locking the plan.

Exit condition:
- the controller understands the work well enough to draft or refresh an executable plan

### Phase 2: Resolve the Active Plan Revision

1. Resolve the latest active revision first: `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` for revision 1, or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` for later material re-plans.
2. Read that latest active revision with `Read`; if it does not exist yet, create revision 1 with the same structure used by `/spwnr:plan`.
3. Draft or refresh the plan and capture the goal, success criteria, scope boundaries, constraints, open risks, current-run execution confirmation, and plan file path in `TodoWrite`.
4. If the task changes the goal, deliverable type, or execution-unit graph, treat it as a material re-plan: create the next revision file, mark the older revision `superseded`, and switch the active plan path to the new revision before continuing.
5. If material unknowns still change decomposition, sequencing, acceptance criteria, or execution topology, present structured follow-up decisions with `AskUserQuestion` and stop in planning mode.

Exit condition:
- one latest active revision exists and contains the current intended execution shape

### Phase 3: Approval Gate

1. If the current run has not received `Execute current plan`, present the latest plan and run `AskUserQuestion` with `Execute current plan`, `Continue improving plan`, and `End this round`.
2. If the user chooses `Continue improving plan`, collect free-form feedback, revise the same active revision when the execution shape still fits, update `Plan Review Loop`, and repeat the review loop instead of creating tasks.
3. If the user chooses `End this round`, preserve the artifact, state that execution has not started, and stop.
4. Do not create tasks, teams, agents, or worktrees until the current run explicitly chooses `Execute current plan`.

Exit condition:
- the current run has explicitly approved execution of the latest active revision

### Phase 4: Build the Approved Execution Spec

1. Validate that the latest active revision contains executable `Execution Units`, `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, and `Failure And Escalation Rules`.
2. Produce a short plan summary, a normalized registry lookup brief, and one concise per-unit coverage brief for each execution unit.
3. Resolve candidate agents from the local registry with `resolve-workers`, using the normalized task brief and current host. When multiple execution units exist, also resolve a per-unit coverage plan with repeatable `--unit "<unit-id>::<brief>"` inputs.
4. If the registry is empty, stale, or does not return a usable candidate pool, stop immediately and return `Worker Readiness Required`. Tell the user to run `/spwnr:workers` to install or inject the missing agents, then return to this same active revision. Do not call `TaskCreate`, `TeamCreate`, `Agent`, `SendMessage`, or `EnterWorktree` on this branch.
5. Choose the execution mode deliberately. Default to `team` for bounded parallel execution units and to `swarm` for coordinated specialist passes on shared output. Use `single-lane` only when parallel coordination is unnecessary or unavailable by design.
6. If `team` or `swarm` is required but `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is not available, stop and tell the user that team features are unavailable instead of silently downgrading.
7. If `swarm` is selected and `EnterWorktree` fails, stop and ask the user whether to downgrade instead of silently switching modes.
8. Build the internal orchestration spec and select a dynamic registry-backed lineup that covers every execution unit. If the per-unit coverage plan exposes uncovered units, stop instead of improvising.
9. Append `Approved Execution Spec` to the latest active revision with `Edit` before any `TaskCreate`.

Exit condition:
- there is an approved execution spec, a valid mode choice, and a registry-backed lineup that fully covers the active revision

### Phase 5: Create the Task Graph

1. Convert the approved `Execution Units` into exact execution tasks, carrying forward ownership boundaries, heartbeat expectations, claim policy, risk level, and worker plan approval requirements.
2. Before the first `TaskCreate`, run a metadata preflight over every draft task description and verify the runtime-guard invariants in `Execution Task Contract` and `Risk-Gated Units`. Do not use hook failures as discovery for these rules.
3. Create a fresh task graph from the active revision. Do not reuse prior task ids, dependency chains, or task status from superseded revisions.
4. Create one task per execution unit with `TaskCreate`.
5. If more than one execution unit exists, create one `integration` task.
6. Always create one `review` task.
7. Include the plan file path, unit id, dependency ids, done definition, assigned capability or package target, mode, worktree requirement, approved execution spec marker, blocked flag, owner, file scope, claim policy, heartbeat, risk, and plan approval state in every task description.
8. Use `TaskGet` and `TaskList` immediately after task creation to confirm that task creation succeeded and the dependency graph matches the approved plan.
9. If `TaskCreate` is blocked, do not say you will execute anyway. Repair the plan artifact or task metadata, then retry only when the contract is valid.

Exit condition:
- the task graph exists, matches the approved plan, and passes the runtime task contract

### Phase 6: Execute, Review, and Close

1. Create the orchestration team with `TeamCreate` when using `team` or `swarm`.
2. Derive only the selected agents with `Agent`, and include the plan file path, required sections to read, selected package name, no-scope-drift rule, ownership boundaries, and any plan-approval gate in every brief.
3. Execute the plan according to the chosen mode and keep every task current with `TaskUpdate`.
4. Record worktree paths and selected package names in the plan file and matching task updates whenever `EnterWorktree` is used.
5. Run the review phase with the best-fit selected validation agent, or with the controller if a separate validation package was not selected.
6. If review finds blocking issues, route the fixes back through execution once using the same orchestration spec and update task state accordingly.
7. Integrate the final response, mark all remaining tasks complete with `TaskUpdate`, and close the team with `TeamDelete`. Exit any active worktrees with `ExitWorktree`.

Exit condition:
- execution is complete, review has run, tasks are closed, and all team or worktree resources are cleaned up

## Execution Task Contract

Every execution, integration, and review task description must include these exact fields:

- `Plan: <path>`
- `Unit: <unit-id>`
- `Mode: <single-lane|team|swarm>`
- `Worktree: <required|optional|not-required>`
- `Blocked: no`
- `Owner: <agent-name|controller|unassigned>`
- `Files: <csv scope or none>`
- `Claim-Policy: <assigned|self-claim>`
- `Risk: <low|medium|high>`
- `Plan-Approval: <not-required|required|approved>`

These fields are mandatory because runtime hooks use them as the minimum contract for task creation and completion.
The plan file referenced by `Plan:` must also contain an `Approved Execution Spec` section before task creation is allowed.
High-risk tasks must not complete while `Plan-Approval:` is still `required`.

### Compatibility Matrix

- `Claim-Policy: assigned` -> `Owner` must be a concrete owner such as an agent name or `controller`; never use `unassigned`
- `Claim-Policy: self-claim` -> `Owner` must start as exactly `unassigned`
- `Risk: high` -> `Plan-Approval` must be `required` or `approved`; never use `not-required`
- if a task is intended to be claimed later by a worker, prefer `Owner: unassigned` with `Claim-Policy: self-claim`
- if a task is already bound to a controller or named worker at creation time, use `Claim-Policy: assigned` with that concrete `Owner`

### TaskCreate Preflight

Before the first `TaskCreate`, the controller must check every draft task description against this exact checklist:

- every required marker is present exactly once with a concrete value
- `Owner` and `Claim-Policy` satisfy the compatibility matrix above
- `Risk` and `Plan-Approval` satisfy the compatibility matrix above
- multi-agent no-worktree tasks have explicit `Files:` ownership boundaries instead of `none`
- high-risk units are already marked for worker plan approval before task creation
- `single-lane` initial graphs default to `Owner: unassigned` plus `Claim-Policy: self-claim` unless the controller intentionally binds the task to a concrete owner

## Orchestration Spec

After approval and before delegation, build an internal orchestration spec containing:

- plan artifact path
- approved objective and success criteria
- normalized registry lookup brief
- candidate pool returned by `resolve-workers`
- per-unit coverage plan and uncovered-unit check
- selected lineup and why each package was chosen
- latest active revision and any superseded revision ids kept for audit
- execution mode
- team topology
- work packages mapped from execution units
- dependencies and merge points
- agent brief per selected package
- final review scope
- fallback policy for registry gaps, `team`, `swarm`, and worktree failures
- fallback policy when the review loop has not yet produced `Execute current plan`
- risky-unit approval gates and file-ownership boundaries

Use this spec as the source of truth for every worker handoff and for the controller's synthesis step.

## Execution Mode Selection

Choose the mode deliberately:

- default to `team` when the approved plan contains multiple bounded execution units with clear ownership and a clean merge path.
- default to `swarm` when multiple specialists must contribute to the same output and repository writes can be isolated with `EnterWorktree`.
- use `single-lane` only when the work is truly sequential, narrow in scope, or team coordination would add more overhead than value.
- do not collapse to `single-lane` just because it is simpler for the controller; mode choice must reflect the approved execution shape.

Mode behavior in this iteration:

- `single-lane`
  - choose one primary selected agent for the main work
  - add a second selected agent only when it materially improves validation or synthesis
- `team`
  - create the shared task queue before creating the team
  - use 2 to 30 selected agents only when multiple distinct specialists materially improve the outcome
  - require teammates to claim or accept units from the shared task queue instead of freelancing
  - target roughly 3 to 6 claimable tasks per teammate when the work has strong fan-out
  - only allow no-worktree multi-agent writes when file ownership boundaries are explicit in the orchestration spec
- `swarm`
  - declare worktree isolation in the execution spec before dispatch
  - create 2 to 30 coordinated work packages that contribute to the same shared output
  - require each writing agent to enter an isolated worktree before mutating repository state
  - use `SendMessage` for cross-teammate incident reporting or lead redirection

## Risk-Gated Units

For any execution unit marked high risk, the controller must:

- create the task with `Risk: high` and `Plan-Approval: required`
- require the assigned teammate to produce a mini-plan before implementation
- review that mini-plan against the current active revision and reject any scope drift
- update the task metadata to `Plan-Approval: approved` before the teammate starts mutating repository state
- stop the task if approval is still missing instead of letting the teammate improvise

## Failure Recovery Contract

Every selected agent brief must include this failure contract:

- if a permission denial, dependency gap, plan contradiction, or worktree failure appears, do not stop silently
- attempt one plan-consistent fallback when that fallback does not change scope
- if the issue remains, call `TaskUpdate` to mark the affected task as blocked and explain why
- then call `SendMessage` to the lead with a structured incident that includes `failed tool`, `reason`, `attempted fallback`, `impact`, and `recommended next step`
- never mark the parent task complete while the issue is still unresolved

The controller must respond to every incident by:

- reading the affected task with `TaskGet`
- re-checking the queue with `TaskList`
- choosing one of: retry, reassign, adjust mode, or ask the user to intervene

When the run is `single-lane` and no team exists, the controller itself must still follow the same incident reporting standard in the user-facing response and in `TaskUpdate`.

## Worker Readiness Required

If `/spwnr:task` cannot form a usable lineup, stop with these sections:

1. `Plan Artifact`
2. `Readiness Gap`
3. `Missing Capabilities`
4. `Recovery Steps`
5. `Next Step`

The recovery steps must:

- list the missing capabilities or packages
- direct the user to run `/spwnr:workers`
- tell the user to install or inject the missing agents
- state that execution should resume from the same active revision after readiness is restored

## Rules

- Do not delegate before the current run has explicitly chosen `Execute current plan`.
- Do not treat a stale plan status marker as approval; only the current run's `Execute current plan` choice unlocks execution.
- Do not mutate state from the planning phase of `/spwnr:task`; task creation and team creation only happen after approval.
- Do not recreate `needs-confirmation` or `approved-plan-ready` in the plan artifact.
- Do not keep executing against a superseded plan revision when a material re-plan has created a newer active revision.
- Do not skip the review stage.
- Do not let the reviewer invent new scope; it should judge the request and the current plan.
- Treat the plan file as the source of truth; do not expect later agents to reconstruct the plan from chat context alone.
- Treat the latest active revision as the source of truth; superseded revisions and their tasks are audit-only.
- Treat the registry candidate pool as the source of truth for lineup selection; do not silently fall back to a hard-coded template.
- Treat the per-unit coverage plan as the source of truth for capability coverage; do not keep uncovered units in the active execution path.
- Do not silently downgrade from `team` or `swarm` to `single-lane` when prerequisites fail.
- Do not bypass a failed `TaskCreate` by directly executing the work.
- Always use `TeamDelete` before finalizing once the orchestration team is no longer needed.
- Keep controller-issued briefs mode-aware by including the package objective, dependency edges, merge expectations, done definition, and exact plan file sections that the agent must read before acting.
- Tailor the output contract to the selected package's job.

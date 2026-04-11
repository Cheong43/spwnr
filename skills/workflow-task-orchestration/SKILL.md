---
name: workflow-task-orchestration
description: Use for /spwnr:task. Reuse the planning gate, require explicit approval, then resolve a dynamic lineup from the Spwnr registry and orchestrate exact execution tasks in single-lane, team, or swarm mode.
---

# Workflow Task Orchestration

Use this skill for non-trivial work that benefits from a controller plus derived agents.

This skill owns the full controller behavior for `/spwnr:task`.

Use `workflow-foundation` as the shared source of truth for context inspection, approach comparison, option-based clarification, and sensible defaults.
Use `worker-audit` only when the user explicitly needs a deeper registry readiness audit or the normal registry lookup path fails.

## Orchestration Rule Set

- use `Skill`, `AskUserQuestion`, `TodoWrite`, `Read`, `Write`, and `Edit` for the planning gate
- after approval, create and track execution tasks with `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate`
- resolve candidate agents from the local Spwnr registry with `spwnr resolve-workers --search "<keyword>" --host claude_code --format json`, or use `pnpm --filter @spwnr/cli dev -- resolve-workers --search "<keyword>" --host claude_code --format json` when the direct binary is unavailable
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
- plan artifact path
- executable `Execution Units`

Track these readiness fields in `TodoWrite` while the plan is still being refined.
Track the plan artifact path at the same time so the later orchestration pass can read the same file.

If the user has not clearly approved the draft plan in the current thread, stop after presenting the plan and ask for confirmation.
Do not delegate agents, do not imply approval, and do not drift into execution just because the plan looks plausible.

## Required Workflow

Always follow this sequence:

1. Clarify and normalize the goal, scope, constraints, success criteria, and decision context.
2. Inspect the repository or current context before asking the user anything.
3. Load `workflow-foundation` and `workflow-task-orchestration` with `Skill`.
4. Compare plausible ways to attack the task before locking the plan.
5. Read `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD-HHMMSS>.md` with `Read`; if it does not exist yet, create it with the same structure used by `/spwnr:plan`.
6. Draft or refresh the plan and capture the goal, success criteria, scope boundaries, constraints, open risks, approval condition, and plan file path in `TodoWrite`.
7. If material unknowns still change decomposition, sequencing, acceptance criteria, or execution topology, present structured follow-up decisions with `AskUserQuestion` and stop in planning mode.
8. If the user has not clearly approved the plan in the current thread, present the proposed plan, ask for confirmation, and stop. Include the plan file path in that response.
9. Validate that the plan artifact contains executable `Execution Units`, `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, and `Failure And Escalation Rules`.
10. Produce a short plan summary and a normalized registry lookup brief that reflects the approved objective, evaluation dimensions, likely comparison set, risk boundaries, and desired deliverable style.
11. Resolve candidate agents from the local registry with `resolve-workers`, using the normalized task brief and current host.
12. If the registry is empty, stale, or does not return a usable candidate pool, stop immediately and return `Worker Readiness Required`. Tell the user to run `/spwnr:workers` to install or inject the missing agents, then return to this same plan file. Do not call `TaskCreate`, `TeamCreate`, `Agent`, `SendMessage`, or `EnterWorktree` on this branch.
13. Append `Approved Execution Spec` to the plan file with `Edit`.
14. Convert the approved `Execution Units` into exact execution tasks.
15. Create one task per execution unit with `TaskCreate`.
16. If more than one execution unit exists, create one `integration` task.
17. Always create one `review` task.
18. Include the plan file path, unit id, dependency ids, done definition, assigned capability or package target, mode, worktree requirement, approved execution spec marker, and blocked flag in every task description.
19. Use `TaskGet` and `TaskList` immediately after task creation to confirm that task creation succeeded and the dependency graph matches the approved plan.
20. Choose the execution mode: `single-lane`, `team`, or `swarm`.
21. `single-lane` is for mostly sequential work with one execution lane.
22. `team` is for multiple independent or lightly coupled execution units coordinated through the shared task queue.
23. `swarm` is for multiple coordinated specialist passes on shared output where writing agents require worktree isolation.
24. If `team` or `swarm` is required but `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is not available, stop and tell the user that team features are unavailable instead of silently downgrading.
25. If `EnterWorktree` fails for `swarm`, stop and ask the user whether to downgrade instead of silently switching modes.
26. Build an internal orchestration spec.
27. Select a dynamic registry-backed lineup that fits the approved plan, the current candidate pool, and the chosen execution mode.
28. Create the orchestration team with `TeamCreate` when using `team` or `swarm`.
29. Derive only the selected agents with `Agent`, and include the plan file path, required sections to read, selected package name, and no-scope-drift rule in every brief.
30. Execute the plan according to the chosen mode and keep every task current with `TaskUpdate`.
31. Record worktree paths and selected package names in the plan file and matching task updates whenever `EnterWorktree` is used.
32. Run the review phase with the best-fit selected validation agent, or with the controller if a separate validation package was not selected.
33. If review finds blocking issues, route the fixes back through execution once using the same orchestration spec and update task state accordingly.
34. Integrate the final response, mark all remaining tasks complete with `TaskUpdate`, and close the team with `TeamDelete`. Exit any active worktrees with `ExitWorktree`.

## Execution Task Contract

Every execution, integration, and review task description must include these exact fields:

- `Plan: <path>`
- `Unit: <unit-id>`
- `Depends-On: <csv or none>`
- `Done: <done definition>`
- `Capability: <capability or selected package>`
- `Mode: <single-lane|team|swarm>`
- `Worktree: <required|optional|not-required>`
- `Approved Execution Spec: present`
- `Blocked: no`

These fields are mandatory because runtime hooks use them as the minimum contract for task creation and completion.

## Orchestration Spec

After approval and before delegation, build an internal orchestration spec containing:

- plan artifact path
- approved objective and success criteria
- normalized registry lookup brief
- candidate pool returned by `resolve-workers`
- selected lineup and why each package was chosen
- execution mode
- team topology
- work packages mapped from execution units
- dependencies and merge points
- agent brief per selected package
- final review scope
- fallback policy for registry gaps, `team`, `swarm`, and worktree failures

Use this spec as the source of truth for every worker handoff and for the controller's synthesis step.

## Execution Mode Selection

Choose the mode deliberately:

- `single-lane` when the approved plan is mostly sequential and one selected agent can carry the main thread of execution cleanly.
- `team` only when the plan contains multiple execution units with clear boundaries, low coupling, and a clean merge path.
- `swarm` only when multiple packages contribute to the same output, the output benefits from concurrent specialist passes, and the controller can isolate repository writes with `EnterWorktree`.

Mode behavior in this iteration:

- `single-lane`
  - choose one primary selected agent for the main work
  - add a second selected agent only when it materially improves validation or synthesis
- `team`
  - create the shared task queue before creating the team
  - use 2 to 30 selected agents only when multiple distinct specialists materially improve the outcome
  - require teammates to claim or accept units from the shared task queue instead of freelancing
  - only allow no-worktree multi-agent writes when file ownership boundaries are explicit in the orchestration spec
- `swarm`
  - declare worktree isolation in the execution spec before dispatch
  - create 2 to 30 coordinated work packages that contribute to the same shared output
  - require each writing agent to enter an isolated worktree before mutating repository state
  - use `SendMessage` for cross-teammate incident reporting or lead redirection

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
- state that execution should resume from the same plan file after readiness is restored

## Rules

- Do not delegate before the plan is explicitly approved.
- Do not mutate state from the planning phase of `/spwnr:task`; task creation and team creation only happen after approval.
- Do not skip the review stage.
- Do not let the reviewer invent new scope; it should judge the request and the current plan.
- Treat the plan file as the source of truth; do not expect later agents to reconstruct the plan from chat context alone.
- Treat the registry candidate pool as the source of truth for lineup selection; do not silently fall back to a hard-coded template.
- Do not silently downgrade from `team` or `swarm` to `single-lane` when prerequisites fail.
- Always use `TeamDelete` before finalizing once the orchestration team is no longer needed.
- Keep controller-issued briefs mode-aware by including the package objective, dependency edges, merge expectations, done definition, and exact plan file sections that the agent must read before acting.
- Tailor the output contract to the selected package's job.

---
description: Validate the approved plan artifact, resolve registry candidates, then orchestrate execution with the workflow-task-orchestration skill.
---

# Spwnr Workflow Task Command

Use the `workflow-task-orchestration` skill for the full controller behavior.

This command is only a thin entrypoint. Keep orchestration logic out of this file.

Guardrails:

- reuse the planning gate first with `Skill`, `AskUserQuestion`, `TodoWrite`, `Read`, `Write`, and `Edit`
- resolve the latest active plan revision first: `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` for revision 1, or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` for later material re-plans
- read that latest active revision with `Read` before orchestration, and stop if the plan is missing or lacks executable `Execution Units`
- if the current run has not yet received `Execute current plan`, use the same execution review loop with `AskUserQuestion` before orchestration
- if the user chooses `Continue improving plan`, revise the same active revision when the execution shape is unchanged, or create the next revision file when the request becomes a material re-plan
- append `Approved Execution Spec` to that active revision with `Edit` before any `TaskCreate`
- generate a normalized registry brief, then resolve a dynamic candidate pool from the local Spwnr registry with `spwnr resolve-workers --search "<normalized brief>" --host claude_code --format json`, or use `pnpm --filter @spwnr/cli dev -- resolve-workers --search "<normalized brief>" --host claude_code --format json` when needed
- when multiple execution units exist, also resolve per-unit coverage with repeatable `--unit "<unit-id>::<brief>"` inputs and prefer the smallest lineup that still covers every unit
- if registry resolution fails or the candidate pool cannot satisfy the required capabilities, stop immediately, do not create tasks or teams, and tell the user to run `/spwnr:workers` to install or inject the missing agents before returning to this same active revision
- after the current-run execute choice, a successful registry resolution, and a persisted `Approved Execution Spec`, create a fresh task graph from the active revision with `TaskCreate`, validate it with `TaskGet` and `TaskList`, and keep it current with `TaskUpdate`
- every task description must include `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval`
- use `single-lane`, `team`, or `swarm` execution only after the current run has received `Execute current plan`
- derive only the selected registry-backed agents with `Agent`
- use `TeamCreate`, `SendMessage`, and `TeamDelete` only in `team` or `swarm` mode
- require `EnterWorktree` and `ExitWorktree` for `swarm`; `single-lane` does not require worktree by default
- if `EnterWorktree` fails, stop and ask the user whether to downgrade instead of silently falling back
- if agent teams are unavailable, treat `team` and `swarm` as unavailable and tell the user explicitly instead of silently downgrading
- always close the orchestration lifecycle with `TeamDelete` when a team was created
- require `Plan-Approval: approved` before completing high-risk tasks
- if `TaskCreate` fails, repair the plan artifact or task metadata first; never say you will directly execute anyway
- keep prior tasks from superseded plan revisions visible for audit, but do not let them drive the active execution path
- do not skip the review phase

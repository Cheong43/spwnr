---
description: Validate the approved plan artifact, resolve registry candidates, then orchestrate execution with the workflow-task-orchestration skill.
---

# Spwnr Workflow Task Command

Use the `workflow-task-orchestration` skill for the full controller behavior.

This command is only a thin entrypoint. Keep orchestration logic out of this file.

Guardrails:

- reuse the planning gate first with `Skill`, `AskUserQuestion`, `TodoWrite`, `Read`, `Write`, and `Edit`
- read `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` with `Read` before orchestration, and stop if the plan is missing, unapproved, or lacks executable `Execution Units`
- append the approved execution spec to that same plan file with `Edit`
- stop at plan confirmation when approval is not explicit
- generate a normalized registry brief, then resolve a dynamic candidate pool from the local Spwnr registry with `spwnr resolve-workers --search "<normalized brief>" --host claude_code --format json`, or use `pnpm --filter @spwnr/cli dev -- resolve-workers --search "<normalized brief>" --host claude_code --format json` when needed
- if registry resolution fails or the candidate pool cannot satisfy the required capabilities, stop immediately, do not create tasks or teams, and tell the user to run `/spwnr:workers` to install or inject the missing agents before returning to this same plan file
- after approval and successful registry resolution, create exact execution tasks with `TaskCreate`, validate them with `TaskGet` and `TaskList`, and keep them current with `TaskUpdate`
- every task description must include `Plan`, `Unit`, `Depends-On`, `Done`, `Capability`, `Mode`, `Worktree`, `Approved Execution Spec`, and `Blocked`
- use `single-lane`, `team`, or `swarm` execution only after approval
- derive only the selected registry-backed agents with `Agent`
- use `TeamCreate`, `SendMessage`, and `TeamDelete` only in `team` or `swarm` mode
- require `EnterWorktree` and `ExitWorktree` for `swarm`; `single-lane` does not require worktree by default
- if `EnterWorktree` fails, stop and ask the user whether to downgrade instead of silently falling back
- if agent teams are unavailable, treat `team` and `swarm` as unavailable and tell the user explicitly instead of silently downgrading
- always close the orchestration lifecycle with `TeamDelete` when a team was created
- do not skip the review phase

---
name: using-spwnr-workflow
description: Use the Spwnr Claude Code plugin as a controller for non-trivial tasks that benefit from executable planning, registry-guided agent orchestration, and guarded execution.
---

# Using Spwnr Workflow

This plugin is a controller, not the worker itself.

`/spwnr:plan` and `/spwnr:task` rely on Claude-native planning plus Spwnr registry-guided agent selection. `/spwnr:workers` remains the deeper audit and recovery surface for local registry health, vendored template sync, and injected agent visibility.

The durable workflow artifact lives at `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md`, and later tasks plus derived agents should read that file instead of guessing the plan from thread context.

Use it when:

- the task is broad enough to benefit from decomposition
- the user wants a safer execution loop with review
- you need to coordinate several derived agents and then synthesize the result

## Command Routing

- Use `/spwnr:workers` when registry health, local package availability, or injected agent visibility is unclear.
- If vendored community templates exist but the local registry is empty or sparse, sync them with `pnpm --filter @spwnr/cli dev -- sync-registry` before expecting registry-backed lineup resolution to look healthy.
- Prefer `/spwnr:plan` when the user wants to align and lock the plan before any execution.
- Prefer `/spwnr:task` when the user wants the same planning gate plus approval-gated execution.
- Even inside `/spwnr:task`, start by planning rather than delegating immediately.
- Use `workflow-planning` as the primary skill behind `/spwnr:plan`.
- Load planning behavior with `Skill`, ask structured follow-up questions with `AskUserQuestion`, track blockers with `TodoWrite`, inspect context with `Read`, and persist the plan to `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD-HHMMSS>.md` with `Write` or `Edit`.
- Use `workflow-task-orchestration` as the primary skill behind `/spwnr:task`.
- After approval, read the plan file with `Read`, append the approved execution spec with `Edit`, resolve registry candidates with `resolve-workers`, create exact execution tasks with `TaskCreate`, validate them with `TaskGet` and `TaskList`, keep them current with `TaskUpdate`, orchestrate `single-lane`, `team`, or `swarm` execution, derive the selected agents with `Agent`, and clean up with `TeamDelete` when a team was created.
- Use `SendMessage` for incident escalation or lead redirection in `team` and `swarm` mode.
- Use `EnterWorktree` and `ExitWorktree` for `swarm` execution that writes repository state, and ask the user before any downgrade if worktree setup fails.
- If registry resolution cannot satisfy the approved capability requirements, stop and direct the user to `/spwnr:workers` before retrying `/spwnr:task`.
- Use `worker-audit` as the primary skill behind `/spwnr:workers`.
- `TeamCreate`, `TeamDelete`, and `SendMessage` require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`; if teams are unavailable, `/spwnr:task` must say so explicitly instead of silently downgrading.

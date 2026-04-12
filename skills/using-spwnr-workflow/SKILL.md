---
name: using-spwnr-workflow
description: Use the Spwnr Claude Code plugin as a controller for non-trivial tasks that benefit from executable planning, registry-guided agent orchestration, and guarded execution.
---

# Using Spwnr Workflow

This plugin is a controller, not the worker itself.

`/spwnr:plan` and `/spwnr:task` rely on Claude-native planning plus Spwnr registry-guided agent selection. `/spwnr:workers` remains the deeper audit and recovery surface for local registry health, vendored template sync, and injected agent visibility.

The durable workflow artifact lives at the latest active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md`, and later tasks plus derived agents should read that file instead of guessing the plan from thread context.

Use it when:

- the task is broad enough to benefit from decomposition
- the user wants a safer execution loop with review
- you need to coordinate several derived agents and then synthesize the result

## Command Routing

- Use `/spwnr:workers` when registry health, local package availability, or injected agent visibility is unclear.
- If vendored community templates exist but the local registry is empty or sparse, sync them with `pnpm --filter @spwnr/cli dev -- sync-registry` before expecting registry-backed lineup resolution to look healthy.
- Prefer `/spwnr:plan` when the user wants to align and lock the plan before any execution, or wants a review-and-revise loop that can auto-handoff into execution later in the same run.
- Prefer `/spwnr:task` when the user wants the same planning gate plus a direct execution entry that can still revise the plan before creating tasks.
- Even inside `/spwnr:task`, start by planning rather than delegating immediately.
- Use `workflow-planning` as the primary skill behind `/spwnr:plan`.
- Load planning behavior with `Skill`, ask structured follow-up questions with `AskUserQuestion`, track blockers with `TodoWrite`, inspect context with `Read`, and persist the plan to the latest active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` with `Write` or `Edit`.
- After every write or revision, `/spwnr:plan` should run the execution review loop with `AskUserQuestion`, using `Execute current plan`, `Continue improving plan`, and `End this round`. `Continue improving plan` keeps the work in the same active revision unless the request becomes a material re-plan, while `Execute current plan` hands off into `workflow-task-orchestration`.
- Use `workflow-task-orchestration` as the primary skill behind `/spwnr:task`.
- After the current run receives `Execute current plan`, read the latest active revision with `Read`, append the `Approved Execution Spec` with `Edit`, resolve registry candidates with `resolve-workers`, build per-unit coverage with repeatable `--unit "<unit-id>::<brief>"` inputs when needed, create a fresh task graph with `TaskCreate`, validate it with `TaskGet` and `TaskList`, keep it current with `TaskUpdate`, orchestrate `single-lane`, `team`, or `swarm` execution, derive the selected agents with `Agent`, and clean up with `TeamDelete` when a team was created.
- Use `SendMessage` for incident escalation or lead redirection in `team` and `swarm` mode.
- Use `EnterWorktree` and `ExitWorktree` for `swarm` execution that writes repository state, and ask the user before any downgrade if worktree setup fails.
- If registry resolution cannot satisfy the approved capability requirements, stop and direct the user to `/spwnr:workers` before retrying `/spwnr:task`.
- If `TaskCreate` is blocked, repair the plan artifact or task metadata first and never continue by directly executing anyway.
- High-risk execution units should carry explicit `Owner`, `Files`, `Claim-Policy`, `Heartbeat`, `Risk`, and `Plan-Approval` metadata so runtime hooks can enforce ownership boundaries and teammate mini-plan approval.
- Keep superseded plan revisions and their tasks visible for audit, but treat only the latest active revision as eligible for execution or stop-hook blocking.
- Use `worker-audit` as the primary skill behind `/spwnr:workers`.
- `TeamCreate`, `TeamDelete`, and `SendMessage` require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`; if teams are unavailable, `/spwnr:task` must say so explicitly instead of silently downgrading.

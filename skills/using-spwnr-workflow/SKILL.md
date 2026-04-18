---
name: using-spwnr-workflow
description: Use the Spwnr Claude Code plugin as the router guide for planning, direct small-task execution, approved workflow execution, and worker recovery.
---

# Using Spwnr Workflow

Use this skill as the router guide for the Spwnr Claude Code plugin.

This plugin is a controller, not the worker itself.

Use it to decide which command fits the task:

- `/spwnr:do` for a bounded small task that can be handled directly in the current run
- `/spwnr:plan` for non-trivial work that needs a locked executable plan
- `/spwnr:task` for executing the approved active plan revision
- `/spwnr:workers` for registry readiness, install, inject, and recovery work

## Command Routing

- Use `/spwnr:do` for bounded small tasks, cleanup work after a larger workflow, follow-up fixes, one-off operations, or a single-goal edit that does not need the full planning flow.
- `/spwnr:do` writes a lightweight runtime note under `.claude/do/spwnr-do-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<slug>.md`.
- `/spwnr:do` may use `Read`, `Write`, `Edit`, `Agent`, and `spwnr resolve-workers`, but it must never create tasks or teams.
- `/spwnr:do` may invoke at most 3 direct workers.
- If `/spwnr:do` finds a worker gap, redirect to `/spwnr:workers`.
- If `/spwnr:do` discovers the task is broad, multi-stage, risky, or planning-sensitive, redirect to `/spwnr:plan`.

- Prefer `/spwnr:plan` when the user wants to align and lock the plan before any execution, or wants a review-and-revise loop that can auto-handoff into execution later in the same run.
- Use `workflow-planning` as the primary skill behind `/spwnr:plan`.
- Load planning behavior with `Skill`, ask structured follow-up questions with `AskUserQuestion`, track blockers with `TodoWrite`, inspect context with `Read`, persist the plan to the latest active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` with `Write` or `Edit`, preview planning candidates with `resolve-workers`, and run a sequential planning expert loop with `Agent` for `research`, `draft`, and `review`.
- If planning-time registry lookup cannot cover those expert roles, stop with `Worker Readiness Required`, direct the user to `/spwnr:workers`, and preserve the same active revision.
- After every write or revision, `/spwnr:plan` should run the execution review loop with `AskUserQuestion`, using `Execute current plan`, `Continue improving plan`, and `End this round`. `Continue improving plan` keeps the work in the same active revision unless the request becomes a material re-plan, while `Execute current plan` hands off into `workflow-task-orchestration`.

- Use `/spwnr:task` only after the task already has a ready active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md`.
- Use `workflow-task-orchestration` as the routing skill behind `/spwnr:task`.
- Planning must choose `pipeline` or `team`, explain why, and persist the execution pattern. `pipeline` plans must record ordered stage handoffs. `team` plans may note that Claude team mode should start multiple pipelines in parallel.
- In `team` mode, naturally prefer plans where parallel units do not edit the same file. Keep shared-file execution available only as an explicit exception with a documented isolation or serialization strategy.
- After the current run receives `Execute current plan`, read the latest active revision with `Read`, append the `Approved Execution Spec` with `Edit`, resolve registry candidates with `resolve-workers`, build per-unit coverage with repeatable `--unit "<unit-id>::<brief>"` inputs when needed, and route to `workflow-task-with-pipeline` or `workflow-task-with-team`.
- Use `SendMessage` for incident escalation or lead redirection in `team` mode.
- If registry resolution cannot satisfy the approved capability requirements, stop and direct the user to `/spwnr:workers` before retrying `/spwnr:task`.
- If `TaskCreate` is blocked, repair the plan artifact or task metadata first and never continue by directly executing anyway.
- Every execution task should carry explicit `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval` metadata because runtime hooks require those exact fields.
- `pipeline` does not require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
- `TeamCreate`, `TeamDelete`, and `SendMessage` require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`; if teams are unavailable, `/spwnr:task` must say so explicitly instead of silently downgrading a `team` plan.

- Use `/spwnr:workers` when registry health, local package availability, or injected agent visibility is unclear.
- Use `worker-audit` as the primary skill behind `/spwnr:workers`.
- If vendored community templates exist but the local registry is empty or sparse, sync them with `spwnr sync-registry` before expecting registry-backed lineup resolution to look healthy.

## Quick Examples

- Small follow-up fix after a completed workflow -> `/spwnr:do`
- Broad coding or research request with several execution units -> `/spwnr:plan`, then `/spwnr:task`
- Approved plan already exists and the user wants execution now -> `/spwnr:task`
- Missing local packages, injection, or registry readiness -> `/spwnr:workers`

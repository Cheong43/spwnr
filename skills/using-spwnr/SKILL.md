---
name: using-spwnr
description: Use for /using-spwnr. Route non-trivial work through /spwnr-plan, then /spwnr-task, while keeping /spwnr-do and /spwnr-worker-audit as alternate lanes.
---

# Using Spwnr

Use this skill as the main entry router for the Spwnr Claude Code plugin.

This plugin is a controller, not the worker itself.

Default workflow:

1. `/spwnr-plan`
2. `/spwnr-task`
3. implement

## Main Route

- Start with `/spwnr-plan` for non-trivial work that needs a locked executable plan before implementation.
- `/spwnr-plan` should load `spwnr-principle` plus `spwnr-plan`, inspect context, ask only material follow-up questions with `AskUserQuestion`, keep blockers visible with `TodoWrite`, and persist the latest active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md`.
- Planning should run a sequential expert loop with `spwnr resolve-workers` plus planning-only `Agent` passes for `research`, `draft`, and `review`.
- Planning must choose `pipeline` or `team`, explain why, and persist the execution pattern.
- After each write or revision, `/spwnr-plan` should run the execution review loop with `AskUserQuestion`, using `Execute current plan`, `Continue improving plan`, and `End this round`.
- `Execute current plan` is the handoff signal into `/spwnr-task`.

- Use `/spwnr-task` after the task already has a ready active revision.
- `/spwnr-task` should review the latest active revision, append `Approved Execution Spec`, resolve registry candidates with `resolve-workers`, build per-unit coverage with repeatable `--unit "<unit-id>::<brief>"` inputs when needed, and route implementation through the helper docs in `skills/spwnr-task/task-pipeline.md` or `skills/spwnr-task/task-team.md`.
- If the approved mode is `team`, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is required. If teams are unavailable, `/spwnr-task` must say so explicitly instead of silently downgrading.
- If registry resolution cannot satisfy the approved capability requirements, stop and direct the user to `/spwnr-worker-audit` before retrying `/spwnr-task`.

## Alternate Lanes

- Use `/spwnr-do` for a bounded small task that can be handled directly in the current run without the full plan artifact flow.
- `/spwnr-do` writes a lightweight runtime note under `.claude/do/spwnr-do-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<slug>.md`.
- `/spwnr-do` may inspect or update local files and notes, use `Agent`, and call `spwnr resolve-workers`, but it must never create tasks or teams.
- `/spwnr-do` may invoke at most 3 direct workers.
- If `/spwnr-do` finds a worker gap, redirect to `/spwnr-worker-audit`.
- If `/spwnr-do` discovers the task is broad, multi-stage, risky, or planning-sensitive, redirect to `/spwnr-plan`.

- Use `/spwnr-worker-audit` when registry health, local package availability, injected agent visibility, or readiness recovery is unclear.
- `/spwnr-worker-audit` is the deeper audit and recovery lane for install, inject, and sync guidance.

## Quick Examples

- Broad coding or research request with several execution units -> `/spwnr-plan`, then `/spwnr-task`, then implement
- Approved plan already exists and the user wants execution now -> `/spwnr-task`
- Small follow-up fix after a completed workflow -> `/spwnr-do`
- Missing local packages, injection, or registry readiness -> `/spwnr-worker-audit`

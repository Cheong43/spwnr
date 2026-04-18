---
name: workflow-do
description: Use for /spwnr:do. Execute a bounded small task directly with optional 1-3 registry-selected workers and a lightweight runtime note.
---

# Workflow Do

Use this skill for small, bounded work that does not need the full plan artifact plus task or team orchestration flow.

This skill owns the direct execution behavior for `/spwnr:do`.

Use `workflow-foundation` only for shared normalization habits and sensible defaults. Do not inherit the full plan-first artifact workflow here.
Use `worker-audit` only when worker coverage is weak or missing and `/spwnr:workers` becomes the right recovery step.

## Execution Tool Protocol

- Use `Skill`, `Read`, `Write`, `Edit`, and `Agent`.
- Use `spwnr resolve-workers --search "<brief>" --host claude_code --format json` for dynamic worker selection.
- You may use at most 3 direct workers in one `/spwnr:do` run.
- Do NOT use task-queue APIs, team orchestration APIs, or lead-messaging APIs from this skill.
- Do NOT create a task queue, worktree graph, or team from this skill.

## Fit Check

`/spwnr:do` is the right lane when the task is:

- a single bounded goal
- a cleanup or follow-up fix after a larger workflow
- a one-off operation, inspection, or narrow edit
- small enough that the controller can synthesize the result in the current run

`/spwnr:do` is NOT the right lane when the task is:

- broad, multi-stage, or clearly decomposed into several execution units
- risky enough to need explicit approval gates
- likely to need a durable plan artifact for later handoff or audit
- better handled by `pipeline` or `team` execution

If the task fails this fit check, stop and redirect to `/spwnr:plan`.

## Lightweight Note Protocol

Every `/spwnr:do` run writes or updates a lightweight note under:

- `.claude/do/spwnr-do-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<slug>.md`

The note must stay small and include these sections in order:

1. `Metadata`
2. `User Request`
3. `Do Readiness`
4. `Worker Selection`
5. `Execution Notes`
6. `Outcome`
7. `Next Recommended Command`

`Do Readiness` must explicitly say one of these outcomes:

- `stayed in /spwnr:do`
- `redirected to /spwnr:plan`
- `blocked on /spwnr:workers`

## Worker Selection

Use one of these two paths:

1. If the user names a template or agent explicitly, try that package first and confirm it supports `claude_code`.
2. Otherwise, normalize the request into a concise retrieval brief and resolve 1-3 best-fit workers from the local registry.

Selection rules:

- keep the lineup as small as possible
- prefer 1 worker when one package can cover the task
- use 2-3 workers only when the slices are clearly bounded and non-overlapping
- do not invent a fallback generic lineup when registry coverage is weak
- if coverage is weak or missing, stop and redirect to `/spwnr:workers`

## Execution Flow

1. Inspect local context with `Read`.
2. Decide whether the task stays in `/spwnr:do` or should escalate to `/spwnr:plan`.
3. Open the lightweight note and record the request plus readiness state.
4. Select up to 3 workers, either from an explicit user choice or from `spwnr resolve-workers`.
5. Brief those workers only on focused bounded slices; keep the controller responsible for the final synthesis.
6. Update the note with worker selection, execution notes, outcome, and the next recommended command.

## Escalation Rules

- If the task becomes broad, multi-stage, risky, or planning-sensitive, stop and send the user to `/spwnr:plan`.
- If worker coverage is weak, missing, or unsupported for `claude_code`, stop and send the user to `/spwnr:workers`.
- If one worker can finish the task cleanly, do not fan out to extra workers.

## Response Shape

Sections in order: `Do Note`, `Fit Check`, `Worker Selection`, `Outcome`, `Next Recommended Command`.

---
name: spwnr-do
description: Handle a small bounded Spwnr task.
---

# Spwnr Do

Use this skill for `/spwnr-do`: small work that can finish in the current run without a durable plan/task/team workflow. Use `spwnr-principle` only for shared normalization habits and defaults.

## Tool Protocol

- Use `Skill`, `Read`, `Write`, `Edit`, and optional `Agent`.
- Resolve optional workers with `spwnr resolve-workers --search "<brief>" --host claude_code --format json`.
- Use at most 3 workers; prefer 1 when one package covers the task.
- Do not create task queues, teams, worktrees, or lead-message workflows.

## Fit Check

Stay in `/spwnr-do` when the work is a single bounded goal, one-off operation, inspection, narrow edit, or follow-up cleanup.

Redirect to `/spwnr-plan` when the task is broad, multi-stage, risky, planning-sensitive, or better handled by `pipeline`/`team`.

Redirect to `/spwnr-worker-audit` only when worker coverage is weak, missing, or unsupported for `claude_code`.

## Lightweight Note

Write or update `.claude/do/spwnr-do-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<slug>.md` with:

1. `Metadata`
2. `User Request`
3. `Do Readiness`
4. `Worker Selection`
5. `Execution Notes`
6. `Outcome`
7. `Next Recommended Command`

`Do Readiness` must say one of: `stayed in /spwnr-do`, `redirected to /spwnr-plan`, or `blocked on /spwnr-worker-audit`.

## Token-Sensitive Flow

1. Inspect only the files or sections needed to decide the fit.
2. Record the request and readiness state in the note.
3. Use a concise retrieval brief for worker selection.
4. Brief workers on focused, non-overlapping slices; keep final synthesis with the controller.
5. Update only the relevant note sections after work completes.

## Response Shape

Use: `Do Note`, `Fit Check`, `Worker Selection`, `Outcome`, `Next Recommended Command`.

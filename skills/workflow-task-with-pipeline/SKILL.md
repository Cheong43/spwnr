---
name: workflow-task-with-pipeline
description: Use for approved /spwnr:task execution when the active plan selects pipeline mode.
---

# Workflow Task With Pipeline

Use this skill when `/spwnr:task` has already validated the active revision and the approved mode is `pipeline`.

Use `workflow-foundation` as the shared source of truth for task metadata, risky-unit approval, and worker readiness recovery.

## Execution Tool Protocol

- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` to build and maintain staged execution tasks.
- Use `Agent` to derive only the selected registry-backed workers for each pipeline stage.
- Resolve registry candidates with `spwnr resolve-workers --search "<keyword>" --host claude_code --format json`, plus repeatable `--unit "<unit-id>::<brief>"` coverage when needed.

## Preconditions

- The latest active revision must already contain `Approved Execution Spec`.
- `Execution Strategy Recommendation` must select `pipeline`.
- The active revision must define the pipeline pattern name, ordered stages, stage objectives, stage inputs, stage outputs, stage acceptance checks, preferred capability tags, and handoff targets.

## Pipeline Topology

- Build a fresh task graph from the latest active revision; keep prior superseded tasks visible only for audit.
- Every execution task, integration task, and review task must carry `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval`.
- Treat each execution unit as a staged handoff through the approved pipeline pattern.
- Keep stages sequential inside each pipeline. Do not advance a unit until the current stage has produced its required handoff artifact and passed its acceptance check.
- `pipeline` must remain executable without Claude team features.

## Execution Flow

1. Confirm the selected lineup and the stage-to-capability mapping.
2. Create the task graph with one staged execution task per unit and stage, plus integration and review tasks when needed.
3. Validate the queue with `TaskGet` and `TaskList`.
4. Derive only the selected registry-backed agents and brief each stage from the active revision instead of chat reconstruction.
5. Use `TaskUpdate` to record stage completion, handoff artifacts, blocked status, and the next stage owner.
6. Repeat until every pipeline stage and review step is complete.

## Failure Recovery Contract

- If a permission denial, dependency gap, plan contradiction, or worktree failure appears, attempt one plan-consistent fallback when it does not change scope.
- If the issue remains, use `TaskUpdate` to mark the task blocked and explain why.
- Report the incident in the user-facing response and keep the active unit blocked until the handoff is repaired.
- Never mark the parent task complete while the issue is unresolved.

## Rules

- Do not silently convert a `pipeline` plan into `team`.
- Do not skip stage acceptance checks or handoff artifacts.
- High-risk tasks must not complete while `Plan-Approval:` is still `required`.
- If `TaskCreate` fails, repair the plan artifact or task metadata first and never execute anyway.

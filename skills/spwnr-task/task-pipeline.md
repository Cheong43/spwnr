# Task Pipeline Helper

Use this helper when `/spwnr-task` has already validated the active revision and the approved mode is `pipeline`.

Use `spwnr-principle` as the shared source of truth for task metadata, risky-unit approval, and worker readiness recovery.

## Execution Tool Protocol

- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` to build and maintain staged execution tasks.
- Use `Agent` to derive only the selected registry-backed workers for each pipeline stage.
- Resolve registry candidates with `spwnr resolve-workers --search "<keyword>" --host claude_code --format json`, plus repeatable `--unit "<unit-id>::<brief>"` coverage when needed.
- For any Claude stage that may mutate files, discover worktree helpers with `ToolSearchTool`, enter an isolated git worktree with `EnterWorktreeTool`, produce a closing summary with `BriefTool`, and exit with `ExitWorktreeTool`.

## Preconditions

- The latest active revision must already contain `Approved Execution Spec`.
- `Execution Strategy Recommendation` must select `pipeline`.
- The active revision must define the pipeline pattern name, ordered stages, stage objectives, stage inputs, stage outputs, stage acceptance checks, preferred capability tags, and handoff targets.

## Pipeline Topology

- Build a fresh task graph from the latest active revision; keep prior superseded tasks visible only for audit.
- Every execution task, integration task, and review task must carry `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval`.
- Use the exact `unit_id` values from the active plan revision. If the plan used a non-canonical markdown variant, normalize it before task creation and keep the task `Unit:` marker byte-for-byte aligned with the normalized unit id.
- Keep `Blocked:` reserved for current block state only. Record sequencing through plan `dependencies`, task graph relations, or an optional `Depends-On:` note instead of putting prerequisite unit ids in `Blocked:`.
- Every new task must start with the literal line `Blocked: no`.
- Treat each execution unit as a staged handoff through the approved pipeline pattern.
- Keep stages sequential inside each pipeline. Do not advance a unit until the current stage has produced its required handoff artifact and passed its acceptance check.
- `pipeline` must remain executable without Claude team features.
- Mutating Claude stages default to `Worktree: required`; keep `Worktree: not-required` only for read-only review or audit tasks.

## Execution Flow

1. Confirm the selected lineup and the stage-to-capability mapping.
2. For each Claude stage that may mutate files, confirm the runtime can discover `ToolSearchTool`, `EnterWorktreeTool`, `BriefTool`, and `ExitWorktreeTool` before execution begins.
3. Create the task graph with one staged execution task per unit and stage, plus integration and review tasks when needed.
4. Validate the queue with `TaskGet` and `TaskList`.
5. Derive only the selected registry-backed agents and brief each stage from the active revision instead of chat reconstruction.
6. Ensure every mutating stage enters its worktree before writing, stays inside it during implementation, emits its `BriefTool` summary at the end, and only then exits the worktree.
7. Use `TaskUpdate` to record stage completion, handoff artifacts, actual blocking incidents, and the next stage owner.
8. Repeat until every pipeline stage and review step is complete.

## Failure Recovery Contract

- If a permission denial, dependency gap, plan contradiction, or worktree failure appears, attempt one plan-consistent fallback when it does not change scope.
- If required worktree tools are missing or the enter/brief/exit lifecycle fails, stop the affected stage immediately and mark it blocked instead of writing in the main tree.
- If the issue remains, use `TaskUpdate` to mark the task blocked and explain why.
- Report the incident in the user-facing response and keep the active unit blocked until the handoff is repaired.
- Never mark the parent task complete while the issue is unresolved.

## Rules

- Do not silently convert a `pipeline` plan into `team`.
- Do not skip stage acceptance checks or handoff artifacts.
- Do not encode sequencing or dependencies in `Blocked:`; use plan `dependencies`, `Depends-On:`, or task graph relations instead.
- High-risk tasks must not complete while `Plan-Approval:` is still `required`.
- If `TaskCreate` fails, repair the plan artifact or task metadata first and never execute anyway.

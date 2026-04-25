# Task Pipeline Helper

Use this helper only after `/spwnr-task` validates an approved `pipeline` plan. Use `spwnr-principle` for task metadata, risky-unit approval, worktree isolation, and readiness recovery.

## Tool Protocol

- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` for staged execution tasks.
- Use `Agent` only for selected registry-backed workers.
- Resolve workers from concise stage/unit briefs.
- For mutating Claude work, use `ToolSearchTool`, `EnterWorktreeTool`, `BriefTool`, `ExitWorktreeTool`, and the worktree lifecycle required by `spwnr-principle`.

## Preconditions

- Latest active revision contains `Approved Execution Spec`.
- `Execution Strategy Recommendation` selects `pipeline`.
- The plan defines the pipeline pattern, pattern name, ordered stages, handoffs, acceptance checks, and capability tags.

## Token-Sensitive Execution

- Read only the active unit, current stage, dependencies, and acceptance checks needed for the next task.
- Brief each worker with plan path, unit id, stage id, owned files, inputs, expected output, acceptance check, and stop conditions.
- Do not pass full plan text or chat history unless the selected section is insufficient.

## Pipeline Topology

- Build a fresh task graph from the latest active revision; superseded tasks are audit-only.
- Every task must carry `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval`.
- Use exact normalized `unit_id` values from the active plan.
- Every new task starts with `Blocked: no`; put sequencing in plan dependencies, graph edges, or `Depends-On:`.
- Keep stages sequential inside each unit.
- `pipeline` works without Claude team features.
- Mutating Claude stages default to `Worktree: required`; read-only review/audit may use `Worktree: not-required`.

## Execution Flow

1. Confirm selected lineup and stage-to-capability mapping.
2. Confirm worktree helper availability for mutating Claude stages.
3. Create staged unit tasks plus integration/review tasks when needed.
4. Validate the queue with `TaskGet` and `TaskList`.
5. Brief selected agents from targeted plan sections.
6. Use `TaskUpdate` for completions, each handoff artifact, blocks, and next owners.
7. Repeat until all stages and reviews are complete.

## Failure Recovery

- Try one plan-consistent fallback when it does not change scope.
- If required worktree tools or lifecycle fail, stop the stage and mark it blocked instead of writing in the main tree.
- Never mark the parent task complete while unresolved.
- If `TaskCreate` fails, repair the plan artifact or task metadata before executing.

## Rules

- Do not convert `pipeline` to `team`.
- Do not skip acceptance checks or handoff artifacts.
- Do not encode sequencing or dependencies in `Blocked:`.
- Every new task must start with the literal line `Blocked: no`.
- High-risk tasks must not complete while `Plan-Approval:` is still `required`.

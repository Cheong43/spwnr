# Task Team Helper

Use this helper when `/spwnr-task` has already validated the active revision and the approved mode is `team`.

Use `spwnr-principle` as the shared source of truth for task metadata, risky-unit approval, and worker readiness recovery.

## Execution Tool Protocol

- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` to build and maintain the shared execution queue.
- Use `TeamCreate`, `Agent`, `SendMessage`, and `TeamDelete` for Claude team orchestration.
- Resolve registry candidates with `spwnr resolve-workers --search "<keyword>" --host claude_code --format json`, plus repeatable `--unit "<unit-id>::<brief>"` coverage when needed.
- For any Claude task that may mutate files, discover worktree helpers with `ToolSearchTool`, enter an isolated git worktree with `EnterWorktreeTool`, produce a closing summary with `BriefTool`, and exit with `ExitWorktreeTool`.

## Preconditions

- The latest active revision must already contain `Approved Execution Spec`.
- `Execution Strategy Recommendation` must select `team`.

## Team Topology

- Build a fresh task graph from the latest active revision; keep prior superseded tasks visible only for audit.
- Every execution task, integration task, and review task must carry `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval`.
- Use the exact `unit_id` values from the active plan revision. If the plan used a non-canonical markdown variant, normalize it before task creation and keep the task `Unit:` marker byte-for-byte aligned with the normalized unit id.
- Keep `Blocked:` reserved for current block state only. Record sequencing through plan `dependencies`, task graph relations, or an optional `Depends-On:` note instead of putting prerequisite unit ids in `Blocked:`.
- Every new task must start with the literal line `Blocked: no`.
- Use multiple bounded execution tasks, explicit ownership, and a shared queue.
- When the approved plan says so, the team may start multiple bounded pipelines in parallel; each pipeline must still preserve its stage order and handoff checks.
- Default the graph so parallel teammates do not edit the same file.
- Mutating Claude tasks default to `Worktree: required`; keep `Worktree: not-required` only for read-only review or audit tasks.
- Preserve shared-file team execution only as an explicit exception; prefer worktree isolation or one concrete owner controlling that file instead of overlapping no-worktree claims.
- Multi-agent no-worktree writes require explicit `Files:` boundaries and should not overlap by default.

## Team Mode Subagent Obligations

Every subagent invoked in `team` mode must follow these two non-negotiable contracts. Include both contracts verbatim in every agent brief alongside the Failure Recovery Contract.

### Progress Sync Contract

All progress of work must be synced with the team lead via `SendMessage`:

- **On task start**: send the accepted work package, assigned unit, and first planned step.
- **After each meaningful step**: send the completed step, its outcome, and the next planned step.
- **On task completion**: send a final status summary listing all completed steps and the resulting outputs or artefacts.
- **On any block or scope question**: send immediately as described in the Failure Recovery Contract below.

Every sync message must include these fields: `unit`, `step`, `status` (one of `in_progress`, `step_done`, `complete`, or `blocked`), `summary`, and `next_step`. When `status` is `complete` or `blocked`, set `next_step` to `none`; when `status` is `in_progress` or `step_done`, `next_step` must name the upcoming step.

### Local Storage Contract

All work done must be stored locally before proceeding to the next step:

- After every meaningful step, invoke `report_progress` to commit and persist completed changes.
- Never accumulate multiple steps of uncommitted work; each step's output must be durable before the next step begins.
- If `report_progress` fails, treat it as a blocking incident: stop all work, report the failure to the team lead via `SendMessage` with `status: blocked`, and do not continue until the team lead explicitly sends a recovery signal (such as `resume` or `retry`) confirming that local storage is stable.

## Execution Flow

1. Confirm the selected lineup and why each package was chosen.
2. Before `TaskCreate`, verify that concurrent tasks have disjoint `Files:` ownership by default; if a shared-file exception exists, verify the plan defines worktree isolation or one concrete owner for that file.
3. For each Claude task that may mutate files, confirm the runtime can discover `ToolSearchTool`, `EnterWorktreeTool`, `BriefTool`, and `ExitWorktreeTool` before execution begins.
4. Create the task graph with one execution task per unit, plus integration and review tasks when needed.
5. Validate the queue with `TaskGet` and `TaskList`.
6. Create the team, derive only the selected registry-backed agents, and brief them from the active revision instead of chat reconstruction.
7. Ensure every mutating agent enters its worktree before writing, stays inside it during implementation, emits its `BriefTool` summary at the end, and only then exits the worktree.
8. Keep the queue current with `TaskUpdate`, enforce risky-unit approval gates, and escalate incidents with `SendMessage`.
9. Close the lifecycle with `TeamDelete`.

## Failure Recovery Contract

- If a permission denial, dependency gap, plan contradiction, or worktree failure appears, attempt one plan-consistent fallback when it does not change scope.
- If required worktree tools are missing or the enter/brief/exit lifecycle fails, stop the affected task immediately and mark it blocked instead of writing in the main tree.
- If the issue remains, use `TaskUpdate` to mark the task blocked and explain why.
- Then use `SendMessage` to the lead with `failed tool`, `reason`, `attempted fallback`, `impact`, and `recommended next step`.
- Never mark the parent task complete while the issue is unresolved.

## Rules

- Do not silently downgrade a `team` plan into `pipeline`.
- Do not let teammates invent new scope.
- Do not encode sequencing or dependencies in `Blocked:`; use plan `dependencies`, `Depends-On:`, or task graph relations instead.
- High-risk tasks must not complete while `Plan-Approval:` is still `required`.
- If `TaskCreate` fails, repair the plan artifact or task metadata first and never execute anyway.

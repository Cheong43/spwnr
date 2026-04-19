# Task Team Helper

Use this helper when `/spwnr-task` has already validated the active revision and the approved mode is `team`.

Use `spwnr-principle` as the shared source of truth for task metadata, risky-unit approval, and worker readiness recovery.

## Execution Tool Protocol

- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` to build and maintain the shared execution queue.
- Use `TeamCreate`, `Agent`, `SendMessage`, and `TeamDelete` for Claude team orchestration.
- Resolve registry candidates with `spwnr resolve-workers --search "<keyword>" --host claude_code --format json`, plus repeatable `--unit "<unit-id>::<brief>"` coverage when needed.

## Preconditions

- The latest active revision must already contain `Approved Execution Spec`.
- `Execution Strategy Recommendation` must select `team`.
- If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is unavailable, stop and report that `team` execution is unavailable.

## Team Topology

- Build a fresh task graph from the latest active revision; keep prior superseded tasks visible only for audit.
- Every execution task, integration task, and review task must carry `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval`.
- Use multiple bounded execution tasks, explicit ownership, and a shared queue.
- When the approved plan says so, the team may start multiple bounded pipelines in parallel; each pipeline must still preserve its stage order and handoff checks.
- Default the graph so parallel teammates do not edit the same file.
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
3. Create the task graph with one execution task per unit, plus integration and review tasks when needed.
4. Validate the queue with `TaskGet` and `TaskList`.
5. Create the team, derive only the selected registry-backed agents, and brief them from the active revision instead of chat reconstruction.
6. Keep the queue current with `TaskUpdate`, enforce risky-unit approval gates, and escalate incidents with `SendMessage`.
7. Close the lifecycle with `TeamDelete`.

## Failure Recovery Contract

- If a permission denial, dependency gap, plan contradiction, or worktree failure appears, attempt one plan-consistent fallback when it does not change scope.
- If the issue remains, use `TaskUpdate` to mark the task blocked and explain why.
- Then use `SendMessage` to the lead with `failed tool`, `reason`, `attempted fallback`, `impact`, and `recommended next step`.
- Never mark the parent task complete while the issue is unresolved.

## Rules

- Do not silently downgrade a `team` plan into `pipeline`.
- Do not let teammates invent new scope.
- High-risk tasks must not complete while `Plan-Approval:` is still `required`.
- If `TaskCreate` fails, repair the plan artifact or task metadata first and never execute anyway.

# Task Team Helper

Use this helper only after `/spwnr-task` validates an approved `team` plan. Use `spwnr-principle` for task metadata, risky-unit approval, worktree isolation, and readiness recovery.

## Tool Protocol

- Use `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` for the shared queue.
- Use `TeamCreate`, `Agent`, `SendMessage`, and `TeamDelete` for Claude team orchestration.
- Resolve workers from concise unit briefs.
- For mutating Claude work, use `ToolSearchTool`, `EnterWorktreeTool`, `BriefTool`, `ExitWorktreeTool`, and the worktree lifecycle required by `spwnr-principle`.

## Preconditions

- Latest active revision contains `Approved Execution Spec`.
- `Execution Strategy Recommendation` selects `team`.
- The plan states whether to use one shared queue or multiple bounded pipelines in parallel.

## Token-Sensitive Execution

- Read only the active unit, owned files, dependencies, acceptance checks, and shared-file exception if any.
- Brief each teammate with plan path, unit id, owned files, required output, acceptance check, sync contract, storage contract, and stop conditions.
- Do not pass full plan text or chat history unless a targeted section is insufficient.

## Team Topology

- Build a fresh task graph from the latest active revision; superseded tasks are audit-only.
- Every task must carry `Plan`, `Unit`, `Mode`, `Worktree`, `Blocked`, `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval`.
- Use exact normalized `unit_id` values from the active plan.
- Every new task starts with `Blocked: no`; put sequencing in plan dependencies, graph edges, or `Depends-On:`.
- Default parallel teammates to disjoint `Files:` ownership so parallel teammates do not edit the same file.
- Shared-file execution must be explicit and use worktree isolation or one concrete owner.
- Mutating Claude tasks default to `Worktree: required`; read-only review/audit may use `Worktree: not-required`.

## Team Mode Subagent Obligations

Include these contracts in every team agent brief.

### Progress Sync Contract

Sync progress with the lead through `SendMessage`:

- On start: accepted work package, unit, and first planned step.
- After each meaningful step: completed step, outcome, and next step.
- On completion: final status summary and outputs.
- On block or scope question: report immediately.

Each message includes `unit`, `step`, `status`, `summary`, and `next_step`. `status` is `in_progress`, `step_done`, `complete`, or `blocked`. Use `next_step: none` for `complete` or `blocked`.

### Local Storage Contract

Persist each meaningful step with `report_progress` before continuing. If it fails, stop, send `status: blocked`, and wait for an explicit recovery signal.

## Execution Flow

1. Confirm the selected lineup and why each package was chosen.
2. Verify concurrent tasks have disjoint `Files:` ownership, or validate the shared-file exception.
3. Confirm worktree helper availability for mutating Claude tasks.
4. Create execution, integration, and review tasks as needed.
5. Validate the queue with `TaskGet` and `TaskList`.
6. Create the team and brief selected agents from targeted plan sections.
7. Enforce worktree lifecycle, progress sync, local storage, and risky-unit approval gates.
8. Use `TaskUpdate` and `SendMessage` for completions, blocks, and escalations.
9. Close with `TeamDelete`.

## Failure Recovery

- Try one plan-consistent fallback when it does not change scope.
- If required worktree tools or lifecycle fail, stop the task and mark it blocked instead of writing in the main tree.
- Report failures to the lead with `failed tool`, `reason`, `attempted fallback`, `impact`, and `recommended next step`.
- Never mark the parent task complete while unresolved.
- If `TaskCreate` fails, repair the plan artifact or task metadata before executing.

## Rules

- Do not downgrade `team` to `pipeline`.
- Do not let teammates invent scope.
- Do not encode sequencing or dependencies in `Blocked:`.
- Every new task must start with the literal line `Blocked: no`.
- High-risk tasks must not complete while `Plan-Approval:` is still `required`.

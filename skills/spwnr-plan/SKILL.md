---
name: spwnr-plan
description: Use for /spwnr-plan. Produce an orchestration-ready plan for non-trivial general tasks, then hand off into execution only after an explicit AskUserQuestion execute choice.
---
# Spwnr Plan
Use this skill when the user wants a scoped plan before substantial work begins. This skill owns the full planning behavior for `/spwnr-plan`.
Use `spwnr-principle` as the shared source of truth for context inspection, plan artifact convention, execution strategy recommendation, execution unit schema, execution review loop, worker readiness required pattern, option-based clarification, and approach comparison. Keep planning-specific behavior here; do not duplicate shared controller rules.

## Planning Tool Protocol
- Use `Skill` to load `spwnr-principle` and `spwnr-plan`.
- Use `Read` before asking for clarification.
- Use `TodoWrite` to keep readiness fields, blockers, and the latest active revision visible.
- Use `Write` or `Edit` to persist the plan artifact; do not leave the durable plan only in chat state.
- Use `AskUserQuestion` for material decisions and the execution review loop.
- You MAY derive planning-only experts with `Agent` only after a draft plan is visible.

## <HARD-GATE>
- Do NOT create any task.
- Do NOT create any team.
- Do NOT enter any worktree.
- Do NOT create execution agents, call `SendMessage`, or implement the final deliverable.
- You MAY derive planning-only experts with `Agent` only for sequential `research`, `draft`, and `review` passes.

## Planning Standard
- The plan must be execution-grade rather than outline-grade.
- Require concrete inputs, outputs, ownership, dependencies, acceptance checks, and escalation for risky work.
- State explicit non-goals, boundaries, defaults, and why the selected execution strategy fits the task shape.
- Reject thin plans that restate the request, use vague verbs like `analyze` or `improve`, hide sequencing behind `as needed`, or bundle materially distinct actions only to stay short.
- At least one rejected approach must be rejected for a concrete operational reason.
- The active revision must be detailed enough for a fresh worker to act without rereading the full thread.

## Planning Checklist
1. Restate the task in 1 to 2 sentences and inspect relevant context with `Read`.
2. Normalize the request into one coherent plan or a small set of independent efforts.
3. Compare 2 to 3 plausible approaches, recommend one, and record the tradeoff.
4. Capture readiness fields in `TodoWrite` and open or create the latest active revision.
5. Draft the plan now instead of waiting for every open decision.
6. Use `AskUserQuestion` only when unresolved details still change decomposition, sequencing, acceptance criteria, or execution topology.
7. Run the planning expert loop and fold the result back into the active revision.
8. If any required planning role lacks viable registry-backed coverage, stop with `Worker Readiness Required` and preserve the same latest active revision.
9. Run a densification pass before finalizing.
10. Self-review the plan for contradictions, placeholders, vague sequencing, and weak handoff quality.

## Complexity Scaling
- For medium tasks, produce at least 3 to 5 execution units.
- For large tasks, produce at least 6 to 10 execution units with explicit dependency structure.
- For ambiguous or high-risk tasks, expand risk handling, approval gates, and fallback logic before expanding execution count.

## Plan Readiness Gate
Before the plan is ready, it must lock the goal, success criteria, scope boundaries, non-goals, constraints, open risks, plan artifact path, executable `Execution Units`, environment and preconditions, execution strategy recommendation, execution pattern shape, agent capability requirements, failure and escalation rules, risky units that require teammate approval, and file ownership boundaries for multi-agent work.
`Execution Strategy Recommendation` must choose `pipeline` or `team`, explain why, and describe the execution pattern shape. `pipeline` plans must persist the ordered stage pattern. `team` plans must say whether Claude team mode should launch multiple pipelines in parallel or stick to one shared queue.
When `team` is selected, default the plan toward units that do not edit the same file in parallel. If shared-file collaboration is truly required, record that as an exception and state the isolation or serialization strategy explicitly.
A plan is not ready unless each `Execution Unit` passes the Handoff Test: a fresh worker can execute it from the active revision, acceptance checks are local and objective, ownership is clear, and stop conditions plus escalation triggers are explicit.

## Plan Artifact Protocol
Apply the Plan Artifact Convention from `spwnr-principle` for path, revision lifecycle, `Revision Status`, `Superseded By`, and the latest active revision rules.
The plan artifact must contain these sections in order:
1. `Metadata`
2. `User Request`
3. `Locked Readiness Fields`
4. `Approach Analysis`
5. `Detailed Plan`
6. `Expert Planning Round`
7. `Decisions Needed`
8. `Plan Review Loop`
9. `Pending Handoff Notes`
`Locked Readiness Fields` must capture assumptions, blockers, approval condition, active revision path, and defaults that materially affect execution.
`Approach Analysis` must persist the execution-relevant comparison only, but do not skip rejected alternatives.
`Detailed Plan` must include `Mission Layer`, `Execution Architecture`, `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, `Execution Units`, and `Failure And Escalation Rules`.
`Mission Layer` must state goal, success criteria, in-scope items, out-of-scope items, explicit non-goals, and constraints.
`Execution Architecture` must state dependency structure, ownership model, approval boundaries, parallel safety assumptions, and serialization points if any.
`Execution Strategy Recommendation` must record the selected mode, rationale, and pattern shape. When `pipeline` is selected, include `pattern name`, ordered `stages`, and per-stage role handoff details. When `team` is selected, include whether the team should start multiple pipelines in parallel.
When `team` is selected, also state whether parallel units have disjoint file ownership by default, or whether a shared-file exception is intentionally required.
`Expert Planning Round` must include `Retrieval Briefs`, `Selected Templates`, `Expert Role Mapping`, `Research Summary`, `Draft Plan Deltas`, `Review Findings`, and `Controller Synthesis`. `Controller Synthesis` must show what changed in the plan because of each pass.
`Decisions Needed` should preserve only unresolved decisions or explicitly locked defaults; resolved decisions should move into `Locked Readiness Fields` or `Detailed Plan`.
`Plan Review Loop` must record the latest execution confirmation state, user feedback summary, and revision summary. Do not recreate the old `needs-confirmation` or `approved-plan-ready` state machine in the plan file.
`Pending Handoff Notes` should contain only execution-relevant reminders, not internal planning transcript.
Each `Execution Unit` must include the full schema from `spwnr-principle`, including `risk level`, `file ownership hints`, `worker plan approval`, and a pipeline pattern reference or override.
Each `Execution Unit` must stay lightweight but executable: use concise operational language, prefer artifact-producing steps over generic verbs, keep acceptance checks objective and local, keep ownership, dependencies, and escalation explicit, and do not add extra fields unless they reduce ambiguity.
The persisted artifact keeps the full execution-unit schema for compatibility. You may present a more concise rendering in chat, but the durable plan on disk must remain execution-safe and machine-checkable.

## Approach Analysis Standard
`Approach Analysis` must compare 2 to 3 plausible approaches across decomposition quality, execution coordination cost, parallelism potential, rollback complexity, expected review burden, risk of hidden coupling, and suitability for `pipeline` vs `team` execution.
Do not recommend an approach unless at least one rejected approach is rejected for a concrete operational reason.
The recommended approach must explain why it reduces coordination or review burden, why it is safer or faster in this specific task shape, and what tradeoff is accepted.

## Planning Expert Loop
1. Generate one retrieval brief for each role: `research`, `draft`, and `review`.
2. Preview registry candidates for each role with `spwnr resolve-workers --search "<brief>" --host claude_code --format json`.
3. Select one viable template per role and keep role assignments distinct.
4. Derive planning-only experts with `Agent` against the active revision instead of raw thread context.
5. Require each expert pass to produce explicit deltas to the active revision, not just commentary.
6. Synthesize their outputs back into `Detailed Plan` and `Expert Planning Round`.
7. If distinct role coverage fails, stop with the `Worker Readiness Required` pattern from `spwnr-principle`.
Each expert pass must contribute as follows: `research` adds missing constraints, dependencies, assumptions, or risk signals; `draft` rewrites thin sections and weak units into executable units; `review` flags ambiguity, hidden coupling, missing approvals, sequencing gaps, or weak acceptance checks.

## Densification Pass
After drafting the first complete plan, identify the 3 weakest or most abstract sections, rewrite them to increase operational specificity, split any execution unit that combines multiple materially different actions, replace vague verbs with artifact-producing actions, ensure acceptance checks are objective and local, and verify that ownership and escalation remain clear after the rewrite.

## Decisions Needed Standard
Use `AskUserQuestion` during planning when an unresolved decision materially changes decomposition, sequencing, acceptance criteria, or execution topology.
Do not leave stale options in `Decisions Needed` after the user has already answered or the controller has locked a default assumption.

## Execution Review Loop
Apply the Execution Review Loop from `spwnr-principle` after every write or revision.
- Update `Plan Review Loop` with execution confirmation time, user feedback summary, and revision summary.
- `Continue improving plan` revises the same latest active revision unless the request becomes a material re-plan.
- A material re-plan creates the next revision and supersedes the older revision.
- Do not recreate the old `needs-confirmation` or `approved-plan-ready` state machine in the plan file.
- `Execute current plan` is the only handoff signal into execution.

## Capability Guidance
Recommend capability requirements by execution unit. For each unit, name the primary capability, any optional supporting trait, and why that capability is the best fit. When `pipeline` is selected, also recommend capability requirements by stage. Keep recommendations generic in `/spwnr-plan`; concrete runtime lineup selection belongs to approved `/spwnr-task` execution.

## Response Shape
Persist the full artifact on disk with all required sections in the plan artifact protocol.
Default user-facing response shape:
- `Plan Artifact`
- `Detailed Plan`
- `Next Step`
If the user explicitly asks to inspect planning internals, you may also expose `Locked Readiness Fields`, `Approach Analysis`, `Expert Planning Round`, `Decisions Needed`, or `Plan Review Loop`.

## Final Planning Rule
Do not present a plan that is merely formatted correctly. Present a plan only when it is dense enough to be handed to a fresh worker with minimal additional interpretation.

---
name: workflow-planning
description: Use for /spwnr:plan. Produce an orchestration-ready plan for non-trivial general tasks, then hand off into execution only after an explicit AskUserQuestion execute choice.
---

# Workflow Planning

Use this skill when the user wants a scoped plan before substantial work begins.

This skill owns the full planning behavior for `/spwnr:plan`.

Use `workflow-foundation` as the shared source of truth for context inspection, plan artifact convention, execution strategy recommendation, execution unit schema, execution review loop, worker readiness required pattern, option-based clarification, and approach comparison. Keep planning-specific behavior here; do not duplicate shared controller rules.

## Planning Tool Protocol

- Use `Skill` to load `workflow-foundation` and `workflow-planning`.
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

## Planning Checklist

1. Restate the task in 1 to 2 sentences and inspect relevant context with `Read`.
2. Normalize the request into one coherent plan or a small set of independent efforts.
3. Compare 2 to 3 plausible approaches, recommend one, and record the tradeoff.
4. Capture readiness fields in `TodoWrite` and open or create the latest active revision.
5. Draft the plan now instead of waiting for every open decision.
6. Use `AskUserQuestion` only when unresolved details still change decomposition, sequencing, acceptance criteria, or execution topology.
7. Run the planning expert loop and fold the result back into the active revision.
8. If any required planning role lacks viable registry-backed coverage, stop with `Worker Readiness Required` and preserve the same latest active revision.
9. Self-review the plan for contradictions, placeholders, and vague sequencing.

## Plan Readiness Gate

Before the plan is ready, it must lock the goal, success criteria, scope boundaries, constraints, open risks, plan artifact path, executable `Execution Units`, environment and preconditions, execution strategy recommendation, agent capability requirements, failure and escalation rules, risky units that require teammate approval, and file ownership boundaries for multi-agent work.
`Execution Strategy Recommendation` must choose `pipeline` or `team`, explain why, and describe the execution pattern shape. `pipeline` plans must persist the ordered stage pattern. `team` plans must say whether Claude team mode should launch multiple pipelines in parallel or stick to one shared queue.
When `team` is selected, default the plan toward units that do not edit the same file in parallel. If shared-file collaboration is truly required, record that as an exception and state the isolation or serialization strategy explicitly.

## Plan Artifact Protocol

Apply the Plan Artifact Convention from `workflow-foundation` for path, revision lifecycle, `Revision Status`, `Superseded By`, and the latest active revision rules.

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

`Detailed Plan` must include `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, `Execution Units`, and `Failure And Escalation Rules`.
`Execution Strategy Recommendation` must record the selected mode, rationale, and pattern shape. When `pipeline` is selected, include `pattern name`, ordered `stages`, and per-stage role handoff details. When `team` is selected, include whether the team should start multiple pipelines in parallel.
When `team` is selected, also state whether parallel units have disjoint file ownership by default, or whether a shared-file exception is intentionally required.

`Expert Planning Round` must include `Retrieval Briefs`, `Selected Templates`, `Expert Role Mapping`, `Research Summary`, `Draft Plan Deltas`, `Review Findings`, and `Controller Synthesis`.

Each `Execution Unit` must include the full schema from `workflow-foundation`, including `risk level`, `file ownership hints`, `worker plan approval`, and a pipeline pattern reference or override.

## Planning Expert Loop

1. Generate one retrieval brief for each role: `research`, `draft`, and `review`.
2. Preview registry candidates for each role with `spwnr resolve-workers --search "<brief>" --host claude_code --format json`.
3. Select one viable template per role and keep role assignments distinct.
4. Derive planning-only experts with `Agent` against the active revision instead of raw thread context.
5. Synthesize their outputs back into `Detailed Plan` and `Expert Planning Round`.
6. If distinct role coverage fails, stop with the `Worker Readiness Required` pattern from `workflow-foundation`.

## Execution Review Loop

Apply the Execution Review Loop from `workflow-foundation` after every write or revision.

- Update `Plan Review Loop` with execution confirmation time, user feedback summary, and revision summary.
- `Continue improving plan` revises the same latest active revision unless the request becomes a material re-plan.
- A material re-plan creates the next revision and supersedes the older revision.
- Do not recreate the old `needs-confirmation` or `approved-plan-ready` state machine in the plan file.
- `Execute current plan` is the only handoff signal into execution.

## Capability Guidance

Recommend capability requirements by execution unit. For each unit, name the primary capability, any optional supporting trait, and why that capability is the best fit. When `pipeline` is selected, also recommend capability requirements by stage. Keep recommendations generic in `/spwnr:plan`; concrete runtime lineup selection belongs to approved `/spwnr:task` execution.

## Response Shape

Sections in order: `Plan Artifact`, `Locked Readiness Fields`, `Approach Analysis`, `Detailed Plan`, `Expert Planning Round`, `Decisions Needed`, `Plan Review Loop`, `Next Step`.

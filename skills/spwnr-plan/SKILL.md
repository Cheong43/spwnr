---
name: spwnr-plan
description: Create an approved Spwnr plan before execution.
---

# Spwnr Plan

Use this skill for `/spwnr-plan`. It creates or revises the latest active plan artifact, then asks whether to execute, improve, or stop. Use `spwnr-principle` for shared contracts: plan artifact convention, execution units, task metadata, approval gates, worker readiness, and the execution review loop.

## Planning Tool Protocol

- Load `spwnr-principle` plus this skill.
- Inspect only relevant repo files and plan sections before asking questions.
- Use `TodoWrite` for blockers, readiness fields, and the active plan path.
- Persist plans with `Write` or targeted `Edit`; do not leave the durable plan only in chat.
- Use `AskUserQuestion` only for decisions that change decomposition, sequencing, acceptance criteria, or execution topology.
- Do not create tasks, teams, worktrees, execution agents, or final deliverables from this skill.
- Planning-only `Agent` passes are allowed only after a draft exists and only for sequential `research`, `draft`, and `review`.

## <HARD-GATE>

- Do NOT create any task.
- Do NOT create any team.
- Do NOT enter any worktree.
- You MAY derive planning-only experts with `Agent` only for `research`, `draft`, and `review`.

## Token-Sensitive File Handling

- Prefer section-scoped reads: `Metadata`, `Locked Readiness Fields`, `Detailed Plan`, `Execution Units`, `Expert Planning Round`, and `Plan Review Loop`.
- Before editing a large plan, read the smallest surrounding section needed to anchor the edit.
- After an edit, verify only the changed section or nearby headings instead of re-reading the whole artifact.
- Avoid attaching complete edited files to later prompts unless the next step truly needs the full file.
- Give planning agents concise briefs: goal, plan path, exact section names or line ranges, expected delta format, and stop conditions.

## Planning Standard

A ready plan must be execution-grade and fresh-worker-safe. It must lock goal, success criteria, boundaries, constraints, assumptions, risks, active artifact path, execution strategy, executable units, capability requirements, failure rules, and approval condition.

Reject thin plans that restate the request, use vague verbs, hide sequencing behind `as needed`, or combine materially different actions only to stay short. At least one rejected approach must have a concrete operational reason.

## Planning Flow

1. Normalize the user request into one coherent task or a small set of independent efforts.
2. Inspect relevant local context with targeted reads.
3. Compare 2-3 plausible approaches and choose one.
4. Create or update the latest active revision using the artifact protocol from `spwnr-principle`.
5. Draft the plan before asking every open question; ask only when the answer materially changes the plan.
6. Run the planning expert loop with concise briefs and fold only useful deltas back into the artifact.
7. Run a densification pass on weak sections and objective acceptance checks.
8. Run the execution review loop.

## Plan Artifact

Use these sections in order:

1. `Metadata`
2. `User Request`
3. `Locked Readiness Fields`
4. `Approach Analysis`
5. `Detailed Plan`
6. `Expert Planning Round`
7. `Decisions Needed`
8. `Plan Review Loop`
9. `Pending Handoff Notes`

`Detailed Plan` must include:

- `Mission Layer`: goal, success criteria, in scope, out of scope, non-goals, constraints
- `Execution Architecture`: dependencies, ownership, approval boundaries, parallel-safety assumptions, serialization points
- `Environment And Preconditions`
- `Execution Strategy Recommendation`: selected `pipeline` or `team`, rationale, and pattern shape
- `Agent Capability Requirements`: generic capability needs by unit and, for pipeline, by stage
- `Execution Units`: fields from `spwnr-principle`, including `risk level`, `file ownership hints`, and `worker plan approval`. Prefer `- **unit_id**: unit-1`.
- `Failure And Escalation Rules`

For `pipeline`, persist pattern name, ordered stages, handoffs, and acceptance checks. For `team`, persist whether to launch multiple pipelines in parallel or use one shared queue, and document any shared-file exception.

`Decisions Needed` should contain only unresolved decisions or locked defaults. `Pending Handoff Notes` should contain only execution-relevant reminders.
Plan metadata must include `Revision Status`, `Superseded By`, material re-plan handling, and the latest active revision.

## Planning Expert Loop

Run `research -> draft -> review` only when it materially improves the plan.

- Preview registry candidates with concise `spwnr resolve-workers` briefs.
- Brief each expert with the active plan path, specific sections to inspect, and the expected delta.
- Do not pass raw thread history or the full plan unless section-scoped context is insufficient.
- Require deltas, findings, or patchable section text; avoid full rewritten artifacts by default.
- If required role coverage fails, stop with `Worker Readiness Required` and preserve the active revision.

Expected contributions:

- `research`: missing constraints, dependencies, assumptions, risks
- `draft`: thin-section rewrites and executable unit improvements
- `review`: ambiguity, coupling, missing approvals, sequencing gaps, weak acceptance checks

## Densification Pass

Before finalizing, improve the 3 weakest sections: split bundled units, replace vague verbs with artifact-producing actions, make acceptance checks local/objective, and verify ownership plus escalation still match the chosen execution strategy.

## Execution Review Loop

After each write or revision, record `Plan Review Loop` and ask for `Execute current plan`, `Continue improving plan`, or `End this round`. Do not recreate the old `needs-confirmation` or `approved-plan-ready` state machine in the plan file.

## Response Shape

Default sections: `Plan Artifact`, `Detailed Plan`, `Next Step`.

Expose planning internals only when useful or requested. Do not present a plan that is merely formatted correctly; present one that can be handed to a fresh worker with minimal interpretation.

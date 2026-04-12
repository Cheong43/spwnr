---
name: workflow-planning
description: Use for /spwnr:plan. Produce an orchestration-ready plan artifact, run the execution review loop, and hand off into execution only after an explicit AskUserQuestion execute choice.
---

# Workflow Planning

Use this skill when the user wants a scoped plan before substantial work begins.

This skill owns the full planning behavior for `/spwnr:plan`.

Use `workflow-foundation` as the shared source of truth for context inspection, option-based clarification, sensible defaults, and approach comparison. Keep planning-specific behavior here; do not duplicate shared controller rules.

## Planning Tool Protocol

- load `workflow-foundation` and `workflow-planning` with `Skill` before specialized planning behavior
- use `AskUserQuestion` for structured follow-up questions that materially change the plan and for the execution review loop
- use `TodoWrite` to maintain the draft plan, blockers, readiness fields, and the latest review-loop outcome
- read supporting repository context with `Read`
- write revision 1 to `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md`, or create `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` for later material re-plans
- keep one active plan revision per project per day: minor refinements update the active revision, while a material re-plan creates the next revision file
- always surface the plan file path in the response
- add `Revision`, `Revision Status`, `Supersedes`, and `Superseded By` metadata to the plan artifact
- update the same active revision in place when the user requests minor revisions, and supersede the older revision when the request becomes a material re-plan
- do not call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `Agent`, `TeamCreate`, `TeamDelete`, `SendMessage`, `EnterWorktree`, or `ExitWorktree` from the planning loop of `/spwnr:plan`

<HARD-GATE>
Do NOT create any task.
Do NOT create any task from the planning loop.
Do NOT create any team.
Do NOT create any team from the planning loop.
Do NOT derive any agent.
Do NOT derive any agent from the planning loop.
Do NOT enter any worktree.
Do NOT enter any worktree from the planning loop.
Do NOT carry out the task itself.
Do NOT produce the final deliverable or perform implementation work from the planning loop.
Your job is to produce the best possible executable plan artifact for the current scope, run the review loop, and hand off cleanly when the user chooses execution.
</HARD-GATE>

## Core Intent

Turn an ambiguous or partially specified request into a practical plan that is:

- concrete enough to orchestrate without guessing
- scoped enough to avoid vague or bloated planning
- honest about uncertainty
- explicit about which open decisions actually matter
- ready to survive several review-and-revise passes without losing continuity

The output should help a later `/spwnr:task` run or an immediate `/spwnr:plan` handoff create precise tasks and choose the right execution topology without reconstructing intent from chat history.

## Plan Readiness Gate

Before a plan can be treated as ready, it must capture:

- goal
- success criteria
- scope boundaries
- constraints
- open risks
- review-loop condition
- plan artifact path
- executable `Execution Units`
- environment and preconditions
- execution strategy recommendation
- agent capability requirements
- failure and escalation rules
- risky execution units that require teammate plan approval before implementation
- file ownership boundaries and heartbeat expectations for multi-agent work

If any of these are still too vague to support decomposition, sequencing, acceptance criteria, or future orchestration, keep asking structured follow-up questions and keep the latest draft visible.

## Checklist

You MUST complete these in order:

1. Restate the task in 1 to 2 sentences.
2. Inspect the relevant context with `Read`.
3. Assess whether the request is one coherent plan or multiple independent efforts.
4. Compare 2 to 3 plausible approaches and recommend one.
5. Capture the readiness fields.
6. Activate planning tools with `Skill` and initialize `TodoWrite`.
7. Open or create the plan artifact with `Write` or `Edit`.
8. Run the clarification loop with `AskUserQuestion` when unresolved details still change decomposition, sequencing, acceptance criteria, or execution topology.
9. Draft the plan now instead of waiting for every open decision.
10. Self-review the plan for contradictions, placeholders, and vague sequencing.
11. Update `Plan Review Loop` with the latest execution confirmation time, user feedback summary, and revision summary.
12. After every write or revision, run the execution review loop with `AskUserQuestion` using `Execute current plan`, `Continue improving plan`, and `End this round`.
13. If the user chooses `Continue improving plan`, collect free-form feedback, revise the same active revision when the execution shape still fits, or create the next revision when the request becomes a material re-plan, then repeat the review loop.
14. If the user chooses `End this round`, preserve the artifact and stop without execution.
15. If the user chooses `Execute current plan`, state that the plan is ready for execution and hand off to `workflow-task-orchestration` instead of creating ad-hoc tasks here.

## Revisioned Plan Files

Treat revision 1 as the base filename for compatibility:

- `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md`

When the user introduces a material re-plan on the same day, create the next revision file:

- `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-r2.md`
- `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-r3.md`

A material re-plan is any change to the goal, deliverable type, or execution-unit graph.
Minor refinements that preserve the execution shape should stay in the latest active revision.
When a new revision is created, mark the previous revision `Revision Status: superseded`, record `Superseded By`, and treat the newer file as the latest active revision.

## Plan Artifact Protocol

The markdown plan artifact is the durable handoff for later orchestration.

- path: `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` for revision 1, or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` for later revisions
- update the same active revision throughout the day for the same project unless a material re-plan requires the next revision file
- use local date for the filename
- do not rely on `TodoWrite` alone as the long-term plan record
- later `/spwnr:task` runs and derived agents must read the latest active revision instead of inferring the plan from thread context
- `Approved Execution Spec` may be appended later before task creation, but it is not a plan-state marker

The plan artifact must contain these sections in order:

1. `Metadata`
2. `User Request`
3. `Locked Readiness Fields`
4. `Approach Analysis`
5. `Detailed Plan`
6. `Decisions Needed`
7. `Plan Review Loop`
8. `Pending Handoff Notes`

Inside `Metadata`, include:

- `Revision`
- `Revision Status`
- `Supersedes`
- `Superseded By`

Inside `Detailed Plan`, add these subsections in order:

1. `Environment And Preconditions`
2. `Execution Strategy Recommendation`
3. `Agent Capability Requirements`
4. `Execution Units`
5. `Failure And Escalation Rules`

Each `Execution Unit` must include:

- `unit_id`
- `objective`
- `preconditions`
- `inputs`
- `implementation steps`
- `expected output`
- `acceptance check`
- `dependencies`
- `preferred capability tags`
- `risk level`
- `file ownership hints`
- `claim policy recommendation`
- `heartbeat expectation`
- `worker plan approval`

## Clarification Loop

When unresolved details still change decomposition, sequencing, acceptance criteria, or later orchestration:

- ask the next best structured follow-up
- keep the latest plan draft visible
- prefer 2 to 4 concrete options with a recommendation
- stop after the current clarification round rather than pretending the plan is settled

## Execution Review Loop

Every time `/spwnr:plan` writes or revises the plan artifact, it must immediately run the execution review loop with `AskUserQuestion`.

The review loop options are fixed:

- `Execute current plan`
- `Continue improving plan`
- `End this round`

Interpret them this way:

- `Execute current plan` is the only execution permission signal that lets `/spwnr:plan` hand off into `workflow-task-orchestration` during the current run
- `Continue improving plan` means do not execute, collect free-form user feedback, revise the same active revision when the execution shape still fits, or create the next revision when the request becomes a material re-plan
- `End this round` means preserve the artifact, stop cleanly, and do not continue asking

Do not recreate the old `needs-confirmation` or `approved-plan-ready` state machine in the plan file. The plan artifact should record the review loop history, not a persistent execution state.

## Capability Guidance

Recommend capability requirements by execution unit, not as a disconnected list.

For each execution unit, specify:

- primary capability
- optional supporting capability or package trait
- why that capability is the best fit

Keep capability recommendations generic in `/spwnr:plan`; concrete runtime agent selection belongs to approved `/spwnr:task` execution through the registry candidate pool.

## Response Shape

Use these sections in order:

1. `Plan Artifact`
2. `Locked Readiness Fields`
3. `Approach Analysis`
4. `Detailed Plan`
5. `Decisions Needed`
6. `Plan Review Loop`
7. `Next Step`

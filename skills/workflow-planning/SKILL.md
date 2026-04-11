---
name: workflow-planning
description: Use for /spwnr:plan. Produce an orchestration-ready plan artifact, surface only material decisions, and stop at plan confirmation without executing.
---

# Workflow Planning

Use this skill when the user wants a scoped plan before substantial work begins.

This skill owns the full planning behavior for `/spwnr:plan`.

Use `workflow-foundation` as the shared source of truth for context inspection, option-based clarification, sensible defaults, and approach comparison. Keep planning-specific behavior here; do not duplicate shared controller rules.

## Planning Tool Protocol

- load `workflow-foundation` and `workflow-planning` with `Skill` before specialized planning behavior
- use `AskUserQuestion` only for structured follow-up questions that materially change the plan
- use `TodoWrite` to maintain the draft plan, blockers, readiness fields, and approval condition
- read supporting repository context with `Read`
- write the detailed plan to `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` with `Write` or `Edit`
- keep one plan file per project per day and update that file instead of creating a second draft
- always surface the plan file path in the response
- do not call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `Agent`, `TeamCreate`, `TeamDelete`, `SendMessage`, `EnterWorktree`, or `ExitWorktree` from `/spwnr:plan`

<HARD-GATE>
Do NOT create any task.
Do NOT create any team.
Do NOT derive any agent.
Do NOT enter any worktree.
Do NOT carry out the task itself.
Do NOT produce the final deliverable, perform execution work, or switch into implementation mode from this skill.
Your job is to produce the best possible executable plan artifact for the current scope, not to start doing the work.
</HARD-GATE>

## Core Intent

Turn an ambiguous or partially specified request into a practical plan that is:

- concrete enough to orchestrate without guessing
- scoped enough to avoid vague or bloated planning
- honest about uncertainty
- explicit about which open decisions actually matter

The output should help a later `/spwnr:task` run create precise tasks and choose the right execution topology without reconstructing intent from chat history.

## Plan Readiness Gate

Before a plan can be treated as ready, it must capture:

- goal
- success criteria
- scope boundaries
- constraints
- open risks
- approval condition
- plan artifact path
- executable `Execution Units`
- environment and preconditions
- execution strategy recommendation
- agent capability requirements
- failure and escalation rules

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
10. Set the plan status to either `needs-confirmation` or `approved-plan-ready`.
11. Self-review the plan for contradictions, placeholders, and vague sequencing.

## Plan Artifact Protocol

The markdown plan artifact is the durable handoff for later orchestration.

- path: `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD-HHMMSS>.md`
- update the same file throughout the day for the same project
- use local date for the filename
- do not rely on `TodoWrite` alone as the long-term plan record
- later `/spwnr:task` runs and derived agents must read this file instead of inferring the plan from thread context

The plan artifact must contain these sections in order:

1. `Metadata`
2. `User Request`
3. `Locked Readiness Fields`
4. `Approach Analysis`
5. `Detailed Plan`
6. `Decisions Needed`
7. `Approval Status`
8. `Pending Handoff Notes`

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

## Clarification Loop

When unresolved details still change decomposition, sequencing, acceptance criteria, or later orchestration:

- ask the next best structured follow-up
- keep the latest plan draft visible
- prefer 2 to 4 concrete options with a recommendation
- stop after the current clarification round rather than pretending the plan is settled

## Plan Status

Every `/spwnr:plan` response must end in one of these states:

- `needs-confirmation` when material decisions remain, approval has not been given, or the user still needs to react to the proposed plan
- `approved-plan-ready` only when the plan is concrete enough to execute and the user has clearly approved it in the current thread

Do not mark the plan `approved-plan-ready` without clear in-thread confirmation from the user.

If the status is `needs-confirmation`, keep the current draft visible and ask the next best structured follow-up questions.
If the status is `approved-plan-ready`, state clearly that the plan is ready to hand off into execution, but do not perform that execution here.

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
2. `Plan Status`
3. `Locked Readiness Fields`
4. `Approach Analysis`
5. `Detailed Plan`
6. `Decisions Needed`
7. `Next Step`

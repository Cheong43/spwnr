---
name: workflow-planning
description: Use for /spwnr:plan. Run a plan-first alignment loop, surface only material decisions, and stop at plan confirmation without executing.
---

# Workflow Planning

Use this skill when the user wants a scoped plan before substantial work begins.

This skill owns the full planning behavior for `/spwnr:plan`.

Use `workflow-foundation` as the shared source of truth for context inspection, option-based clarification, sensible defaults, and approach comparison. Keep planning-specific behavior here; do not duplicate shared controller rules.

<HARD-GATE>
Do NOT delegate to worker subagents.
Do NOT carry out the task itself.
Do NOT produce the final deliverable, perform execution work, or switch into implementation mode from this skill.
Your job is to produce the best possible plan for the current scope, not to start doing the work.
</HARD-GATE>

## Core Intent

Turn an ambiguous or partially-specified request into a practical plan that is:

- concrete enough to act on
- scoped enough to avoid vague or bloated planning
- honest about uncertainty
- explicit about which open decisions actually matter

A good output should help someone begin the work confidently, even if a few decisions are still open.

## Planning Principles

- **Plan first, don’t stall** — produce a best-effort plan even when some details are still undecided.
- **Ask only high-leverage questions** — surface only the choices that materially affect scope, sequence, quality, effort, or output.
- **Prefer structured choices** — when clarification is needed, present options with a recommendation.
- **Keep clarifying until the plan is executable** — if open details still change decomposition, sequencing, or acceptance criteria, ask the next structured follow-up instead of pretending the plan is settled.
- **Decompose oversized requests** — if the request actually contains multiple independent workstreams, say so and plan the first sensible slice.
- **Follow the context** — inspect the available materials, constraints, and current situation before deciding the plan.
- **Default intelligently** — when the user has not specified something minor, make a sensible assumption and state it briefly.
- **Do not imply approval** — the plan is not ready for execution until the user has clearly confirmed it in-thread.

## Anti-Pattern: “There Isn’t Enough Info To Plan Yet”

Do not block planning just because some details are missing.

Unless the request is fundamentally incoherent, you should still produce:

- a recommended direction
- a phased or stepwise draft plan
- explicit assumptions
- a short list of only the decisions that could change the plan in a meaningful way

Do not return an empty shell full of placeholders.

## Plan Readiness Gate

Before a plan can be treated as ready, it must capture:

- goal
- success criteria
- scope boundaries
- constraints
- open risks
- approval condition

If any of these are still too vague to support decomposition, sequencing, or acceptance criteria, keep asking structured follow-up questions and keep the latest draft visible.

## Checklist

You MUST complete these in order:

1. **Restate the task** — summarize the goal in 1–2 sentences.
2. **Inspect context** — check relevant materials, documents, background, constraints, or current state.
3. **Assess scope** — determine whether this is one coherent plan or multiple independent efforts.
4. **Compare approaches** — identify 2–3 plausible ways to proceed and recommend one.
5. **Capture readiness fields** — lock the goal, success criteria, scope boundaries, constraints, open risks, and approval condition.
6. **Run the clarification loop** — keep asking structured follow-up questions when unresolved details still change decomposition, sequencing, or acceptance criteria.
7. **Draft the plan now** — produce a best-effort plan without waiting for every open decision.
8. **Set the plan status** — end in either `needs-confirmation` or `approved-plan-ready`.
9. **Assign role ownership** — map each phase to the role or type of contributor best suited for it.
10. **Self-review the plan** — remove placeholders, contradictions, and vague sequencing before finalizing.

## Scope Handling

Before writing the plan, assess whether the request is too broad for a single coherent plan.

Signs it needs decomposition:

- multiple loosely-coupled goals
- distinct outputs with different success criteria
- separate workstreams that should be planned independently
- a plan that becomes generic because the scope is too broad

When this happens:

1. State that the request should be decomposed.
2. Name the main workstreams, sub-projects, or tracks.
3. Recommend an order.
4. Produce the full plan for the **first** sub-project or first meaningful slice, not for everything at once.

## Workflow

### 1. Restate the task
Reframe the request in plain language.

Include:
- target outcome
- what “done” likely means
- the likely form of the output or result

### 2. Inspect context
Look at the most relevant context before deciding the plan.

Examples:
- source materials
- current documents
- prior work
- stated preferences
- deadlines
- stakeholders
- tools, channels, or format constraints

Keep this short and evidence-based.

### 3. Compare plausible approaches
Always consider 2–3 viable approaches when meaningful.

For each approach, evaluate:
- effort required
- time to first useful result
- coordination overhead
- risk
- flexibility
- fit with the user’s context and goals

Recommend one approach clearly.

### 4. Capture readiness fields
Before treating the plan as execution-ready, make the critical frame explicit:

- goal
- success criteria
- scope boundaries
- constraints
- open risks
- approval condition

Keep these visible in the draft so the user can confirm or correct them directly.

### 5. Run the clarification loop
When unresolved details still change decomposition, sequencing, or acceptance criteria:

- ask the next best structured follow-up
- keep the latest plan draft visible
- prefer 2 to 4 concrete options with a recommendation
- stop after the current clarification round rather than pretending the plan is settled

### 6. Draft a best-effort plan immediately
Do not wait for every open question to be resolved.

The plan should:
- be phase-based or step-based
- include concrete outputs for each phase
- reflect dependencies and sequencing
- identify major risks or uncertainties
- remain usable under stated assumptions

### 7. Surface only material decisions
Do not ask for preferences that do not meaningfully affect the plan.

Good decisions to surface:
- target audience
- scope boundary
- priority order
- depth vs speed tradeoff
- output format when it changes the work
- review or approval path

Bad decisions to surface:
- cosmetic wording choices
- low-impact stylistic preferences
- details that can safely be deferred

When listing a decision, always include:
- what the decision is
- the recommended option
- 2–4 concrete options
- how the plan changes if a different option is chosen

### 8. Set the plan status explicitly
Every `/spwnr:plan` response must end in one of these states:

- `needs-confirmation` — use this when material decisions remain, approval has not been given, or the user still needs to react to the proposed plan.
- `approved-plan-ready` — use this only when the plan is concrete enough to execute and the user has clearly approved it in the current thread.

If the status is `needs-confirmation`, keep the current draft visible and ask the next best structured follow-up questions.
If the status is `approved-plan-ready`, state clearly that the plan is ready to hand off into execution, but do not perform that execution here.

### 9. Assign recommended roles
Recommend roles by phase, not as a disconnected list.

For each phase, specify:
- primary role
- optional supporting role(s)
- why that role is the best fit

Use broad, task-neutral roles where possible, such as:
- researcher
- writer
- analyst
- coordinator
- reviewer
- operator
- subject matter expert

### 10. Self-review before finalizing
Review the plan and fix issues inline.

Check for:
1. **Placeholder scan** — remove `TBD`, `TODO`, blanks, or filler.
2. **Plan integrity** — steps should have clear sequence and dependencies.
3. **Scope sanity** — make sure the plan matches the actual size of the request.
4. **Decision quality** — keep only decisions that materially affect the plan.
5. **Role fit** — ensure recommended roles match the work described.

## Output Format

Use short sections in this order:

1. `Plan Status`
2. `Goal`
3. `Situation Assessment`
4. `Approach Analysis`
5. `Constraints`
6. `Draft Plan`
7. `Decisions Needed`
8. `Recommended Roles`

### Section Requirements

#### Plan Status
State:
- `Status`: either `needs-confirmation` or `approved-plan-ready`
- `Why`: why this status is the correct one right now
- `Approval Condition`: the exact approval still needed, or `Already approved in-thread`

#### Goal
State:
- what is being planned
- what success looks like
- what output or result this plan is preparing for
- the success criteria that execution will be judged against

#### Situation Assessment
Summarize:
- relevant context inspected
- current state
- notable unknowns
- whether the request is properly scoped or should be decomposed

#### Approach Analysis
Must contain exactly these subsections:

- `Alternatives Considered`
- `Recommended Approach`
- `Why This Wins`

`Alternatives Considered` should compare 2–3 options briefly but concretely.

#### Constraints
List only constraints that meaningfully affect the plan, such as:
- scope boundaries
- time limits
- resource limits
- dependency constraints
- required approvals
- audience expectations
- channel, format, or tool restrictions
- open risks that should stay visible during execution

#### Draft Plan
Write a compact phase-based or step-based plan.

For each phase include:
- objective
- key actions
- expected output
- major dependency or risk if relevant

Prefer 3–7 phases.

#### Decisions Needed
Only include unresolved choices that materially change the plan.

Format each decision exactly like this:

- `Decision`: <what must be decided>
- `Recommended`: <best option>
- `Options`: <2–4 concrete options with brief tradeoffs>

If no material decisions remain, say:
`No blocking decisions right now. Proceed with the recommended approach and adjust only if constraints change.`

If the only missing step is explicit user approval, include that as a decision and make the recommended option the cleanest approval path.

#### Recommended Roles
Map roles to phases.

Use this structure:

- `Phase`: <phase name>
- `Primary Role`: <role>
- `Support`: <optional role(s)>
- `Why`: <brief reason>

## Behavior Rules

- Do not delegate to subagents from this skill.
- Do not perform the planned work from this skill.
- If the request is simple, still produce a real plan.
- If the request is too broad, decompose it and plan the first meaningful slice.
- Do not leave sections blank or use placeholder filler.
- Do not turn minor preferences into blocking questions.
- Keep asking structured, high-leverage follow-up questions when the plan is not yet ready.
- Do not mark the plan `approved-plan-ready` without clear in-thread confirmation from the user.
- Prefer a strong recommendation over vague neutrality.
- Keep the output compact, but specific enough that someone could confidently begin work from it.

---
name: workflow-foundation
description: Shared controller rules for executable planning, approval-gated orchestration, registry-guided agent selection, and runtime guardrails.
---

# Workflow Foundation

Use this skill as the shared ruleset behind Spwnr workflow planning and orchestration.

## Shared Expectations

- Load the primary workflow skill with `Skill` before applying plan-specific or task-specific behavior.
- Inspect repository or supplied context with `Read` before asking the user anything.
- For non-trivial work, enter a plan-first gate before delegation or implementation.
- Use `AskUserQuestion` for material clarification decisions when 2 to 4 concrete options are available.
- Use `TodoWrite` to keep the draft plan, blockers, readiness fields, and approval condition visible through the planning gate.
- Persist the shared plan artifact with `Write` or `Edit`, and treat the latest active plan revision as the durable source of truth for later tasks and registry-selected agents.
- Compare at least 2 plausible approaches when the path is not obvious, state the recommended approach, and explain why it fits best.
- Convert blocking uncertainty into 2 to 4 concrete options, mark one as recommended, and give a one-line tradeoff for each option.
- Keep the work moving with a provisional default when the user has not chosen yet.
- If the repository is empty or underspecified, propose sensible defaults and label them clearly.
- During `/spwnr:plan`, a planning-only `Agent` pass is allowed only after a draft plan is visible and only for sequential expert `research`, `draft`, and `review` passes backed by registry preview.
- Do not call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, `TeamDelete`, or `SendMessage` for non-trivial work until a draft plan is visible and the user has clearly approved it.
- Treat plan approval as thread-local and conversational. Clear approval signals include phrases like `continue`, `execute`, and `go ahead`.
- Treat a material re-plan as any change to the goal, deliverable type, or execution-unit graph. Minor refinements stay in the same active revision; material re-plans create the next revision file and supersede the older revision.

## Plan-First Gate

- A ready plan must lock the goal, success criteria, scope boundaries, constraints, open risks, and approval condition.
- A ready plan must exist on disk at `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<GOAL>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<GOAL>-rN.md`.
- A ready plan must be explicit enough for a later agent to execute without reconstructing intent from chat history.
- Keep asking structured follow-up questions while unresolved details still change decomposition, sequencing, acceptance criteria, or execution topology.
- Keep the current draft visible while clarifying so the user can react to something concrete.
- If uncertainty is still material, stop in planning mode and ask for confirmation instead of drifting into execution.

## Request Normalization

- Translate the user's raw wording into a structured task brief before choosing the approach.
- Extract the decision goal, stated and implied constraints, time horizon when relevant, evaluation criteria, comparable options, risk surface, and expected deliverable.
- When a request is broad, colloquial, or underspecified, default to this route: break down the goal, define the evaluation framework, compare viable options, then surface risks and evidence gaps.
- Do not require the user to rewrite the prompt when the controller can infer sensible defaults safely.
- In high-risk or sensitive domains, keep the work useful by reframing toward decision-support materials, due diligence, option comparison, and explicit boundaries instead of a final directive.

## Clarification Style

- Ask only after request normalization has exposed a decision that materially changes the approach.
- Never ask only open-ended clarification questions when concrete options are possible.
- Prefer `AskUserQuestion` over free-form questioning when it can carry the decision cleanly.
- Ask at most 3 decision questions in one response.
- Prefer repeated short clarification rounds over one overloaded questionnaire.
- Keep the current draft or current direction visible while waiting for the user's choice.

## Thinking Standard

- Do not jump from the first idea straight into a plan.
- Think carefully before answering.
- Compare viable directions, choose deliberately, then explain the choice.
- For broad research or implementation tasks, prefer a professional analytical structure over generic brainstorming.

## Plan Artifact Convention

- Revision 1 path: `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<GOAL>.md`
- Later material re-plans on the same day: `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<GOAL>-r2.md`, `-r3.md`, and so on
- When a new revision is created, mark the previous revision `Revision Status: superseded`, record `Superseded By`, and treat the newer file as the latest active revision.
- Every plan artifact must include `Revision`, `Revision Status`, `Supersedes`, and `Superseded By`.
- Superseded revisions and their tasks are audit-only.

## Execution Unit Schema

Every `Execution Unit` in the plan artifact must include:

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

## Execution Task Contract

Every execution, integration, and review task created with `TaskCreate` must include these exact fields in the task description:

- `Plan: <path>`
- `Unit: <unit-id>`
- `Mode: <single-lane|team>`
- `Worktree: <required|optional|not-required>`
- `Blocked: no`
- `Owner: <agent-name|controller|unassigned>`
- `Files: <csv scope or none>`
- `Claim-Policy: <assigned|self-claim>`
- `Risk: <low|medium|high>`
- `Plan-Approval: <not-required|required|approved>`

These fields are mandatory because runtime hooks use them as the minimum contract for task creation and completion. The plan file referenced by `Plan:` must contain an `Approved Execution Spec` section before task creation is allowed. High-risk tasks must not complete while `Plan-Approval:` is still `required`.

### Compatibility Matrix

- `Claim-Policy: assigned` -> `Owner` must be a concrete owner such as an agent name or `controller`; never use `unassigned`
- `Claim-Policy: self-claim` -> `Owner` must start as exactly `unassigned`
- `Risk: high` -> `Plan-Approval` must be `required` or `approved`; never use `not-required`

### TaskCreate Preflight

Before the first `TaskCreate`, the controller must check every draft task description against this exact checklist:

- every required marker is present exactly once with a concrete value
- `Owner` and `Claim-Policy` satisfy the compatibility matrix
- `Risk` and `Plan-Approval` satisfy the compatibility matrix
- multi-agent no-worktree tasks have explicit `Files:` ownership boundaries instead of `none`
- high-risk units are already marked for worker plan approval before task creation
- `single-lane` initial graphs default to `Owner: unassigned` plus `Claim-Policy: self-claim` unless the controller intentionally binds the task

## Execution Review Loop

Every time a plan artifact is written or revised, immediately run the execution review loop with `AskUserQuestion`. The three options are fixed:

- `Execute current plan` — the only execution permission signal; hands off into `workflow-task-orchestration`
- `Continue improving plan` — do not execute; collect feedback; revise the same active revision when the execution shape still fits, or create the next revision when the request becomes a material re-plan; then repeat the loop
- `End this round` — preserve the artifact, stop cleanly, and do not continue asking

Do not recreate a `needs-confirmation` or `approved-plan-ready` state machine in the plan file. Record review loop history in the artifact, not a persistent execution state.

## Risk-Gated Units

For any execution unit marked high risk, the controller must:

1. Create the task with `Risk: high` and `Plan-Approval: required`.
2. Require the assigned teammate to produce a mini-plan before implementation.
3. Review that mini-plan against the latest active revision and reject any scope drift.
4. Update the task to `Plan-Approval: approved` before the teammate mutates repository state.
5. Stop the task if approval is still missing instead of letting the teammate improvise.

## Worker Readiness Required Pattern

Use this pattern whenever a registry or capability gap blocks forward progress. Stop and emit these five sections:

1. `Plan Artifact` — state the current artifact path
2. `Readiness Gap` — name the specific missing capabilities or packages
3. `Missing <Capability Type>` — list exactly what is needed
4. `Recovery Steps` — direct the user to `/spwnr:workers`, preserve the same active revision, state that work should resume from the same active revision after readiness is restored, and never silently downgrade
5. `Next Step` — confirm the handoff path

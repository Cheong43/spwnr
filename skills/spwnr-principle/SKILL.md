---
name: spwnr-principle
description: Shared Spwnr planning and orchestration rules.
---

# Spwnr Principle

Use this skill as the shared rulebook for Spwnr planning, approval-gated execution, registry-guided worker selection, and runtime guardrails.

## Shared Expectations

- Load the primary workflow skill with `Skill` before acting.
- Inspect local context before asking the user.
- For non-trivial work, plan before delegation or implementation.
- Use `AskUserQuestion` for material decisions with 2 to 4 concrete options.
- Use `TodoWrite` for blockers, readiness fields, and approval condition.
- Persist the shared plan artifact with targeted `Write` or `Edit`.
- Ask structured questions only when the answer changes decomposition, sequencing, acceptance criteria, or execution topology.
- Persist the latest active plan revision on disk and treat it as the source of truth.
- Compare plausible approaches when the path is not obvious.
- Keep provisional defaults explicit when the user has not chosen.
- During `/spwnr-plan`, a planning-only `Agent` pass is allowed only after a draft plan is visible.
- Do not call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, `TeamDelete`, or `SendMessage` for non-trivial work until a draft plan exists and the current run has approved execution.
- Treat material re-plans as changes to goal, deliverable type, or execution-unit graph; create a new revision for those.

## Request Normalization

- Translate the user's raw wording into a structured task brief.
- Do not require the user to rewrite the prompt when safe defaults are inferable.
- For high-risk or sensitive work, prefer decision-support materials with explicit boundaries.
- Convert blocking uncertainty into 2 to 4 concrete options.

## Prompt Economy

- Prefer section-scoped reads and targeted edits over full-file loops.
- After editing a plan, verify only the changed section unless the whole artifact may be invalid.
- Brief workers with concise goals, plan path, exact section names or line ranges, owned files, expected output, acceptance check, and stop conditions.
- Avoid passing full thread history, full plan text, or full edited-file attachments unless targeted context is insufficient.
- Ask agents for deltas, findings, or patchable section text by default.

## Plan Artifact Convention

- Revision 1 path: `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<GOAL>.md`
- Later material re-plans: same path with `-r2`, `-r3`, and so on.
- Every plan records `Revision`, `Revision Status`, `Supersedes`, and `Superseded By`.
- New revisions mark the previous revision `superseded`; only the latest active revision is executable.

## Ready Plan Contract

A ready plan must lock goal, success criteria, scope boundaries, constraints, assumptions, risks, approval condition, active artifact path, execution strategy, executable units, capability requirements, failure rules, and ownership boundaries.

It must be explicit enough for a fresh worker to execute from the artifact without reconstructing intent from chat.

## Execution Strategy Recommendation Contract

- Every ready plan chooses exactly one mode before approval: `pipeline` or `team`.
- Record selected mode, rationale, and pattern shape in `Execution Strategy Recommendation`.
- For `pipeline`, persist pattern name, ordered stages, stage objectives, inputs, outputs, acceptance checks, capability tags, and handoffs.
- For `team`, state whether to launch multiple bounded pipelines or one shared queue.
- Team plans default to disjoint file ownership; do not default to multiple teammates editing the same file in parallel.
- multiple bounded pipelines in parallel are allowed only when the plan says so.
- `pipeline` must work without Claude team features.

## Execution Unit Schema

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
- `pipeline pattern reference or override`

Render field labels as single-line bullets. Preferred marker: `- **unit_id**: unit-1`. Compatible fallbacks include `- **unit_id:** unit-1`, `- unit_id: unit-1`, and full-width colon variants; do not hide `unit_id` in tables or prose.

## Execution Task Contract

Every execution, integration, and review task created with `TaskCreate` must include:

- `Plan: <path>`
- `Unit: <unit-id>`
- `Mode: <pipeline|team>`
- `Worktree: <required|optional|not-required>`
- `Blocked: no`
- `Owner: <agent-name|controller|unassigned>`
- `Files: <csv scope or none>`
- `Claim-Policy: <assigned|self-claim>`
- `Risk: <low|medium|high>`
- `Plan-Approval: <not-required|required|approved>`

The referenced plan must contain `Approved Execution Spec`. `Blocked:` is reserved for current block state only. New tasks write `Blocked: no`; sequencing belongs in plan dependencies, graph edges, or `Depends-On:`.

### Compatibility Matrix

- `Claim-Policy: assigned` requires a concrete `Owner`.
- `Claim-Policy: self-claim` starts with `Owner: unassigned`.
- `Risk: high` requires `Plan-Approval: required` or `approved`.

When the launch policy targets Claude Code with worktree-required mutation isolation, Claude mutating tasks default to `Worktree: required`; reserve `Worktree: not-required` for read-only review/audit. Mutating work must discover `ToolSearchTool`, enter with `EnterWorktreeTool`, summarize with `BriefTool`, and exit with `ExitWorktreeTool`.

### TaskCreate Preflight

Before the first `TaskCreate`, check marker presence, compatibility matrix, `Blocked: no`, disjoint team file ownership, shared-file exceptions, worktree policy, and high-risk approval state.

## Execution Review Loop

After every plan write or revision, ask:

- `Execute current plan` — only execution permission signal; hand off to `/spwnr-task`
- `Continue improving plan` — revise the same active revision unless this becomes a material re-plan
- `End this round` — preserve the artifact and stop cleanly

Record review history in the artifact; do not recreate a persistent approval state machine.

## Risk And Readiness

High-risk units require `Risk: high`, `Plan-Approval: required`, a teammate mini-plan, controller approval, then `Plan-Approval: approved` before mutation.

When registry or capability gaps block progress, stop with:

1. `Plan Artifact`
2. `Readiness Gap`
3. `Missing <Capability Type>`
4. `Recovery Steps` — direct to `/spwnr-worker-audit`, preserve the active revision, and never silently downgrade
5. `Next Step`

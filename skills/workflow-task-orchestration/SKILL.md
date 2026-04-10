---
name: workflow-task-orchestration
description: Use for /spwnr:task. Reuse the planning gate, require explicit approval, then orchestrate research plus adaptive single-lane, parallel, or swarm execution and review.
---

# Workflow Task Orchestration

Use this skill for non-trivial work that benefits from a controller plus worker subagents.

This skill owns the full controller behavior for `/spwnr:task`.

Use `workflow-foundation` as the shared source of truth for context inspection, approach comparison, option-based clarification, and sensible defaults.
Use `worker-audit` as the shared source of truth for worker resolution and install guidance.

## Planning Gate

Start with the same planning gate standards used by `/spwnr:plan`.

Before any delegation, the controller must lock:

- goal
- success criteria
- scope boundaries
- constraints
- open risks
- approval condition

If the user has not clearly approved the draft plan in the current thread, stop after presenting the plan and ask for confirmation.
Do not delegate workers, do not imply approval, and do not drift into execution just because the plan looks plausible.

## Required Workflow

Always follow this sequence:

1. Clarify and normalize the goal, scope, constraints, success criteria, and likely decision context.
2. Inspect the repository or current context before asking the user anything.
3. Compare plausible ways to attack the task before locking the plan.
4. Draft the plan and capture the goal, success criteria, scope boundaries, constraints, open risks, and approval condition.
5. If material unknowns still change decomposition, sequencing, or acceptance criteria, present structured follow-up decisions and stop in planning mode.
6. If the user has not clearly approved the plan in the current thread, present the proposed plan, ask for confirmation, and stop.
7. Read `.claude-plugin/workers.json`.
8. Verify worker availability in project `.claude/agents/` and user `~/.claude/agents/`.
9. Stop immediately if any required role is unavailable.
10. Build an internal orchestration spec.
11. Choose the execution mode: `single-lane`, `parallel`, or `swarm`.
12. Run one shared research pass if needed.
13. Execute the plan according to the chosen mode.
14. Synthesize the execution results into one candidate outcome.
15. Delegate to the `review` worker.
16. If review finds blocking issues, route the fixes back through execution once using the same orchestration spec.
17. Integrate the final response.

## Orchestration Spec

After approval and before delegation, build an internal orchestration spec containing:

- approved objective and success criteria
- execution mode
- work packages
- dependencies and merge points
- worker brief per package
- final review scope

Use this spec as the source of truth for every worker handoff and for the controller's synthesis step.

## Execution Mode Selection

Choose the mode deliberately:

- When context is incomplete, run one shared research pass if needed before dispatching executor work packages.

- `single-lane` when the approved plan is mostly sequential and extra concurrency would add coordination noise.
- `parallel` when the plan contains independent work packages with clear boundaries, low coupling, and a clean merge path.
- `swarm` when multiple packages contribute to the same output and benefit from concurrent executor perspectives on one shared objective.

Mode behavior in this iteration:

- `single-lane`
  - optionally run one shared `research` pass
  - run one `execute` worker on the full plan
  - synthesize and review once
- `parallel`
  - optionally run one shared `research` pass
  - split the approved plan into independent work packages
  - reuse the configured `execute` role, which typically resolves to `general-executor`, across multiple packages
  - synthesize all package results and review once
- `swarm`
  - optionally run one shared `research` pass
  - create 2 to 4 coordinated work packages that contribute to the same shared output
  - reuse the configured `execute` role, which typically resolves to `general-executor`, across those coordinated packages
  - synthesize the combined result and review once

## Normalization And Depth Defaults

- After approval, Produce a short plan and a normalized worker brief before dispatching the orchestration spec.
- Before delegation, translate the raw request into a worker brief that captures the original intent, decision goal, relevant time horizon, evaluation dimensions, likely comparison set, risk boundaries, and desired deliverable style.
- Do not force the user to restate the task in a more formal way when the controller can construct a sound brief.
- When the task is broad, ambiguous, or non-technical, default to a deep analytical structure instead of a shallow answer.
- In high-risk or sensitive domains, ask workers for decision-support materials rather than a final directive.
- Keep controller-issued briefs mode-aware by including the package objective, dependency edges, merge expectations, and done definition for each worker run.

## Handoff Contracts

Require these sections from every worker:

- `research`
  - `findings`
  - `assumptions`
  - `recommendation`
  - `blockers`
  - `findings` must cover the normalized task framing, evaluation dimensions, evidence gaps, and key uncertainties.
- `execute`
  - `proposed result`
  - `rationale`
  - `unresolved risks`
  - each execute brief must name the execution mode, work package, package objective, dependencies, merge contract, and done definition
  - `proposed result` should usually include a concise summary, analysis framework, candidate comparison or scenario breakdown, key supporting evidence, major risks, and follow-up diligence.
  - In high-risk or sensitive domains, present decision-support materials rather than a final directive.
- `review`
  - `pass-fail`
  - `issues`
  - `suggested fixes`
  - `residual risk`
  - the review brief must include the approved plan, orchestration spec, synthesized candidate outcome, and success criteria
  - `issues` must call out shallow analysis, missing evidence support, or missing boundary statements when those weaken the result.
  - Use `pass-fail = fail` when the result is too shallow for the request, lacks an evidence chain, or omits material risks or boundaries.

## Response Modes

If `/spwnr:task` stops before approval, use:

1. `Plan Status`
2. `Proposed Plan`
3. `Decisions Needed`
4. `Next Step`

If execution completes, use:

1. `Outcome`
2. `Process Summary`
3. `Risks Or Open Questions`
4. `Next Steps`

## Rules

- Do not delegate before the plan is explicitly approved.
- Do not skip the review stage.
- Do not let the reviewer invent new scope; it should judge the request and the current plan.
- If review finds blocking issues, route blocking review feedback back through the execute step once, then finalize.
- For clearly code-focused tasks, keep the execution output concrete and implementation-oriented instead of inflating it into a generic strategy memo.
- Reuse the current `research`, `execute`, and `review` roles instead of inventing new worker roles for this workflow.
- Keep task-specific control flow and worker output contracts here; do not duplicate shared controller rules from `workflow-foundation` or worker resolution rules from `worker-audit`.

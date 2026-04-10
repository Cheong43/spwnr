---
name: workflow-foundation
description: Shared controller rules for plan-first goal alignment, approval-gated execution, approach comparison, and default-driven clarification.
---

# Workflow Foundation

Use this skill as the single shared ruleset behind Spwnr workflow planning and orchestration.

## Shared Expectations

- Inspect repository or supplied context before asking the user anything.
- For non-trivial work, enter a planning gate before delegation or implementation.
- Compare at least 2 plausible approaches when the path is not obvious.
- State the recommended approach and why it is the best fit.
- Convert blocking uncertainty into 2 to 4 concrete options.
- Mark one option as recommended.
- Give a one-line tradeoff for each option.
- Keep the work moving with a provisional default when the user has not chosen yet.
- If the repository is empty or underspecified, propose sensible defaults and label them clearly.
- Do not delegate worker subagents for non-trivial work until a draft plan is visible and the user has clearly approved it.
- Treat plan approval as thread-local and conversational. Clear approval signals include phrases like `continue`, `execute`, `go ahead`, or `按这个 plan 做`.

## Plan-First Gate

- A ready plan must lock the goal, success criteria, scope boundaries, constraints, open risks, and approval condition.
- Keep asking structured follow-up questions while unresolved details would materially change decomposition, sequencing, or acceptance criteria.
- Keep the current draft visible while clarifying so the user can react to something concrete instead of restating the task from scratch.
- If uncertainty is still material, stop in planning mode and ask for confirmation or a choice instead of drifting into execution.

## Request Normalization

- Translate the user's raw wording into a structured task brief before choosing the approach.
- Extract the decision goal, stated and implied constraints, time horizon when relevant, evaluation criteria, comparable options, and risk surface.
- When a request is broad, colloquial, or underspecified, default to this analysis route: break down the goal, define the evaluation framework, compare viable options, then surface risks and evidence gaps.
- Do not require the user to rewrite the prompt when the controller can infer sensible defaults safely.
- In high-risk or sensitive domains, keep the work useful by reframing toward decision-support materials, due diligence, option comparison, and explicit boundaries instead of a final directive.

## Clarification Style

- Ask only after request normalization has exposed a decision that materially changes the approach.
- Ask only for decisions that materially change the approach.
- Never ask only open-ended clarification questions when concrete options are possible.
- Ask at most 3 decision questions in one response.
- Prefer repeated short clarification rounds over one overloaded questionnaire.
- Keep the current draft or current direction visible while waiting for the user's choice.

## Thinking Standard

- Do not jump from the first idea straight into a plan.
- Think carefully before answering.
- Compare viable directions, choose deliberately, then explain the choice.
- For broad research tasks, prefer a professional analytical structure over generic brainstorming.

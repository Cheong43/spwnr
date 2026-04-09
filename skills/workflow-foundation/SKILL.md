---
name: workflow-foundation
description: Shared controller rules for context inspection, approach comparison, option-based clarification, and default-driven planning.
---

# Workflow Foundation

Use this skill as the single shared ruleset behind Spwnr workflow planning and orchestration.

## Shared Expectations

- Inspect repository or supplied context before asking the user anything.
- Compare at least 2 plausible approaches when the path is not obvious.
- State the recommended approach and why it is the best fit.
- Convert blocking uncertainty into 2 to 4 concrete options.
- Mark one option as recommended.
- Give a one-line tradeoff for each option.
- Keep the work moving with a provisional default when the user has not chosen yet.
- If the repository is empty or underspecified, propose sensible defaults and label them clearly.

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
- Keep the current draft or current direction visible while waiting for the user's choice.

## Thinking Standard

- Do not jump from the first idea straight into a plan.
- Think carefully before answering.
- Compare viable directions, choose deliberately, then explain the choice.
- For broad research tasks, prefer a professional analytical structure over generic brainstorming.

---
name: quality-gate
description: Evaluate whether the proposed result satisfies the task, the plan, and the available evidence.
---

# Quality Gate

Use this skill to perform a focused review instead of broad brainstorming.

## Focus

- analysis depth relative to the request
- correctness against the request
- alignment with the controller plan
- support from the research evidence
- remaining risk after the proposed result
- whether boundaries and risk statements are explicit enough

## Output Standard

Always organize the result into:

- pass-fail
- issues
- suggested fixes
- residual risk

Inside `issues`, explicitly call out:

- shallow analysis
- unsupported claims or a missing evidence chain
- missing risk or boundary statements

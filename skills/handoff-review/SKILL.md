---
name: handoff-review
description: Enforce consistent worker output contracts and integrate review feedback before finalizing the response.
---

# Handoff Review

The workflow only counts as complete after the review worker has evaluated the execute worker's result.

## Output Contracts

- research
  - findings
  - assumptions
  - recommendation
  - blockers
- execute
  - proposed result
  - rationale
  - unresolved risks
- review
  - pass-fail
  - issues
  - suggested fixes
  - residual risk

## Controller Responsibilities

- Reject worker output that skips its required sections.
- Route blocking review feedback back through execution once when needed.
- In the final response, distinguish between confirmed outcomes and remaining uncertainty.

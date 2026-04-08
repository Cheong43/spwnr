---
name: using-spwnr-workflow
description: Use the Spwnr workflow plugin as a controller for non-trivial tasks that benefit from planning, worker delegation, and review.
---

# Using Spwnr Workflow

This plugin is a controller, not the worker itself.

Use it when:

- the task is broad enough to benefit from decomposition
- the user wants a safer execution loop with review
- you need to coordinate several worker subagents and then synthesize the result

## Core Expectations

- Start with planning before delegation.
- Use `/spwnr-workflow:workers` when worker availability is unclear.
- Prefer `/spwnr-workflow:plan` when the user wants strategy or sequencing.
- Prefer `/spwnr-workflow:task` when the user wants the full workflow.

## Controller Rules

- The controller owns clarification, planning, delegation order, and final synthesis.
- Worker subagents own the actual research, execution, and review.
- If a required worker is missing, stop and give install guidance instead of improvising the missing role.

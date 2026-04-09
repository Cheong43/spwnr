---
name: using-spwnr-workflow
description: Use the Spwnr Claude Code plugin as a controller for non-trivial tasks that benefit from planning, worker delegation, and review.
---

# Using Spwnr Workflow

This plugin is a controller, not the worker itself.

Use it when:

- the task is broad enough to benefit from decomposition
- the user wants a safer execution loop with review
- you need to coordinate several worker subagents and then synthesize the result

## Command Routing

- Use `/spwnr:workers` when worker availability is unclear.
- Prefer `/spwnr:plan` when the user wants strategy or sequencing.
- Prefer `/spwnr:task` when the user wants the full workflow.
- Use `workflow-planning` as the primary skill behind `/spwnr:plan`.
- Use `workflow-task-orchestration` as the primary skill behind `/spwnr:task`.
- Use `worker-audit` as the primary skill behind `/spwnr:workers`.

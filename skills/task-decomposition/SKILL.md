---
name: task-decomposition
description: Turn a broad request into a short execution plan and explicit worker handoffs.
---

# Task Decomposition

Break work into a short controller plan before delegation.

## Planning Checklist

- goal
- success criteria
- constraints
- relevant repository areas or context
- likely worker roles
- key risks

## Handoff Design

Every worker handoff should include:

- the original user request
- the current plan
- relevant files or context
- the exact output contract expected from that worker

Keep the plan short. The controller is responsible for sequencing, not for writing a giant spec every time.

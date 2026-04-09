---
description: Run the full workflow by using the workflow-task-orchestration skill.
---

# Spwnr Workflow Task Command

Use the `workflow-task-orchestration` skill for the full controller behavior.

This command is only a thin entrypoint. Keep task orchestration logic out of this file.

Guardrails:

- do not skip the review phase
- if required workers are missing, stop and report that clearly

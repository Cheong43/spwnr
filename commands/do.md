---
description: Execute a bounded small task directly by using the workflow-do skill.
---

# Spwnr Workflow Do Command

Use the `workflow-do` skill as the `/spwnr:do` controller.

This command is only a thin entrypoint. Keep small-task execution logic out of this file.

Guardrails:

- load `workflow-do` with `Skill`
- use `Read` before asking for clarification
- persist the lightweight runtime note with `Write` or `Edit` under `.claude/do/`
- use `spwnr resolve-workers` plus `Agent` only for direct small-task worker selection
- cap direct worker selection at 3 agents
- if the task is too broad, multi-stage, or planning-sensitive, stop and redirect to `/spwnr:plan`
- if worker coverage is weak or missing, stop and redirect to `/spwnr:workers`
- never call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, `SendMessage`, or `TeamDelete`
- never create a task queue or team from this command

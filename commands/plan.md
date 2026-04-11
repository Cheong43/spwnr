---
description: Align and lock an executable plan before any orchestration by using the workflow-planning skill.
---

# Spwnr Workflow Plan Command

Use the `workflow-planning` skill for the full planning behavior.

This command is only a thin entrypoint. Keep command-specific behavior out of this file.

Guardrails:

- load `workflow-foundation` and `workflow-planning` with `Skill`
- use `AskUserQuestion` only for material clarification decisions
- use `TodoWrite` to track the draft plan, blockers, readiness fields, and approval condition
- inspect supporting repository context with `Read`
- persist the detailed plan to `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` with `Write` or `Edit`
- keep one plan file per project per day, and update that file instead of creating a second draft
- upgrade `Detailed Plan` into orchestration-ready `Execution Units`
- include `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, and `Failure And Escalation Rules` in the plan artifact
- always echo the plan file path and plan status in the response so later agents can read the same artifact
- never call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `Agent`, `TeamCreate`, `TeamDelete`, `EnterWorktree`, or `ExitWorktree` from this command
- never call `SendMessage` from this command
- never create tasks, teams, or agents from this command
- never implement changes from this command
- stop in planning mode when approval is still missing

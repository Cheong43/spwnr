---
description: Align and lock an executable plan before any orchestration by using the workflow-planning skill.
---

# Spwnr Workflow Plan Command

Use the `workflow-planning` skill for the full planning behavior.

This command is only a thin entrypoint. Keep command-specific behavior out of this file.

Guardrails:

- load `workflow-foundation` and `workflow-planning` with `Skill`
- use `AskUserQuestion` for material clarification decisions and the execution review loop
- use `TodoWrite` to track the draft plan, blockers, readiness fields, and the latest review-loop outcome
- inspect supporting repository context with `Read`
- persist the detailed plan with `Write` or `Edit` to `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` for revision 1, or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` for later material re-plans
- keep one active plan revision per project per day: minor refinements update the latest active revision, while a material re-plan creates the next revision file and supersedes the prior revision
- upgrade `Detailed Plan` into orchestration-ready `Execution Units`
- add `Revision`, `Revision Status`, `Supersedes`, and `Superseded By` metadata to the plan artifact
- include `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, and `Failure And Escalation Rules` in the plan artifact
- include `Plan Review Loop` in the plan artifact and always echo the plan file path in the response so later agents can read the same artifact
- after each write or revision, immediately run the execution review loop with `AskUserQuestion`
- when the user chooses `执行当前计划`, hand off to `workflow-task-orchestration` instead of asking for a separate `/spwnr:task`
- never call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `Agent`, `TeamCreate`, `TeamDelete`, `EnterWorktree`, or `ExitWorktree` from this command
- never call `SendMessage` from this command
- never create tasks, teams, or agents from this command
- never implement changes from this command
- if the user chooses `继续改进计划`, collect free-form feedback, revise the same active revision when the execution shape is still the same, or create the next revision file when the request becomes a material re-plan
- if the user chooses `结束本轮`, preserve the plan artifact and stop without execution

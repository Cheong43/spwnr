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
- after the first draft plan is visible, generate planning retrieval briefs for `research`, `draft`, and `review`
- preview registry candidates for each planning role with `resolve-workers`
- derive only planning-only experts with `Agent`, require distinct role assignments across `research`, `draft`, and `review`, keep them sequential and controller-led, and record the outcome in `Expert Planning Round`
- upgrade `Detailed Plan` into orchestration-ready `Execution Units`
- add `Revision`, `Revision Status`, `Supersedes`, and `Superseded By` metadata to the plan artifact
- include `Expert Planning Round` in the plan artifact and capture retrieval briefs, selected templates, role mapping, expert findings, and controller synthesis
- include `Environment And Preconditions`, `Execution Strategy Recommendation`, `Agent Capability Requirements`, and `Failure And Escalation Rules` in the plan artifact
- require `Execution Strategy Recommendation` to choose `pipeline` or `team`, justify that choice, and describe the execution pattern; if `pipeline` is chosen, persist the ordered stage pattern, and if `team` is chosen, note whether the plan should fan out multiple pipelines in parallel
- include `Plan Review Loop` in the plan artifact and always echo the plan file path in the response so later agents can read the same artifact
- if planning-time registry lookup cannot provide viable experts for any required role, stop with `Worker Readiness Required`, direct the user to `/spwnr:workers`, and preserve the same active revision
- after each write or revision, immediately run the execution review loop with `AskUserQuestion`
- when the user chooses `Execute current plan`, hand off to `workflow-task-orchestration` instead of asking for a separate `/spwnr:task`
- never call `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, or `TeamDelete` from this command
- never call `SendMessage` from this command
- never create tasks or teams from this command
- never derive execution agents from this command
- never implement changes from this command
- if the user chooses `Continue improving plan`, collect free-form feedback, revise the same active revision when the execution shape is still the same, or create the next revision file when the request becomes a material re-plan
- if the user chooses `End this round`, preserve the plan artifact and stop without execution

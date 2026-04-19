# Claude Plugin Workflow

This repository includes a repo-root Claude Code plugin named `spwnr` that acts as a workflow controller for direct small-task execution plus executable planning and registry-guided agent, task, and team orchestration.

The plugin is a dogfood asset for this repository. It is not a published Spwnr package. Its command surface now lives entirely under `skills/`. `/using-spwnr` is the main router and should default to `/spwnr-plan`, then `/spwnr-task`, then implement. `/spwnr-do` is the bounded small-task lane: it uses Claude-native `Skill`, `Read`, `Write`, `Edit`, `Agent`, and the local `spwnr` registry for direct worker selection, writes a lightweight note under `.claude/do/spwnr-do-<project-folder-name>-<YYYY-MM-DD-HHMMSS>-<slug>.md`, caps direct worker selection at 1-3, and redirects to `/spwnr-worker-audit` or `/spwnr-plan` when the fit is wrong. `/spwnr-plan` and `/spwnr-task` remain the heavier plan-first lane, while `/spwnr-worker-audit` provides the deeper audit and recovery path. Planning must choose `pipeline` or `team`, persist the execution pattern, and let `/spwnr-task` route into `skills/spwnr-task/task-pipeline.md` or `skills/spwnr-task/task-team.md`. The shared workflow artifact is the latest active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md`. These workflows are for general tasks such as research, analysis, writing, operations, and coding, not only software implementation.

## What The Plugin Does

The plugin coordinates a plan-first workflow:

1. clarify the request
2. load the planning stack with `Skill`
3. draft and refine the plan until the important details are aligned
4. ask only material decisions with `AskUserQuestion`
5. track blockers and review-loop outcomes with `TodoWrite`
6. inspect repository context with `Read`
7. write or update the latest active plan revision with `Write` or `Edit`
8. generate planning retrieval briefs for `research`, `draft`, and `review`
9. preview planning candidates with `resolve-workers` and derive planning-only experts with `Agent`
10. synthesize their outputs into `Expert Planning Round`, or stop with `Worker Readiness Required` and route the user to `/spwnr-worker-audit` if the planning expert set cannot be formed
11. run the execution review loop after each successful write, asking whether to `Execute current plan`, `Continue improving plan`, or `End this round`
12. if the current run receives `Execute current plan`, read the latest active revision with `Read`, validate executable `Execution Units`, validate the planned `pipeline` or `team` decision, append `Approved Execution Spec` with `Edit`, and resolve a candidate pool with `resolve-workers`
13. route execution into `skills/spwnr-task/task-pipeline.md` or `skills/spwnr-task/task-team.md`
14. create and validate the execution queue with `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate`
15. derive only the selected registry-backed agents with `Agent`
16. execute in `pipeline` or `team` mode
17. use `TeamCreate`, `SendMessage`, and `TeamDelete` only when the approved plan requires `team` execution
18. integrate the final answer

For small direct work, `/spwnr-do` bypasses the plan artifact flow and instead:

1. checks that the task is still bounded and suitable for direct execution
2. writes a lightweight runtime note under `.claude/do/`
3. selects at most 3 registry-backed workers with `resolve-workers`, or uses an explicit named template when the user provides one
4. redirects to `/spwnr-worker-audit` when worker coverage is weak
5. redirects to `/spwnr-plan` when the task grows beyond a bounded small task

The controller lives in the repo root under:

- `.claude-plugin/`
- `hooks/`
- `skills/`

## Registry Audit Surface

The agents remain normal Spwnr subagent packages published into the local Spwnr registry. The bundled examples are still useful defaults for `/spwnr-worker-audit` and for optional manual injection:

- `examples/general-researcher`
- `examples/general-executor`
- `examples/general-reviewer`

Dynamic selection can audit other published packages, including synced community templates, as long as they exist in the local registry and support `claude_code`. If `.claude-plugin/workers.json` is missing, the built-in default dynamic policy still remains active.

`/spwnr-task` uses this same registry selection path directly during normal execution. If lineup resolution fails, `/spwnr-worker-audit` becomes the required recovery step before execution should continue.

## Recommended Setup

1. Load the repo-root plugin in Claude Code with one of these options:

```text
/plugin marketplace add /absolute/path/to/spwnr
/plugin install spwnr@spwnr
```

or for local development:

```bash
claude --plugin-dir /absolute/path/to/spwnr
```

2. Use the workflow commands inside Claude:

- `/using-spwnr`
- `/spwnr-do`
- `/spwnr-plan`
- `/spwnr-task`
- `/spwnr-worker-audit`

3. Only if you want the registry audit to see vendored community templates, sync them into the local registry:

```bash
spwnr sync-registry
```

4. Preview dynamic registry candidates for a task:

```bash
spwnr resolve-workers --search "Implement a backend API and review it" --host claude_code --format json
```

5. Inject subagents into Claude Code when you want a fixed baseline immediately:

```bash
spwnr inject general-researcher --host claude_code --scope project
spwnr inject general-executor --host claude_code --scope project
spwnr inject general-reviewer --host claude_code --scope project
```

6. Enable agent teams if you want `team` mode or if the approved plan should launch multiple pipelines in parallel:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

## Command Intent

`/using-spwnr`
- route the default non-trivial path through `/spwnr-plan`, then `/spwnr-task`, then implement, while still pointing to `/spwnr-do` for bounded tasks and `/spwnr-worker-audit` for readiness recovery

`/spwnr-do`
- handle a bounded small task directly, write a lightweight note under `.claude/do/`, use `resolve-workers` plus `Agent` only for up to 3 direct workers, redirect to `/spwnr-worker-audit` when worker coverage is weak, and redirect to `/spwnr-plan` when the task becomes broad, multi-stage, risky, or planning-sensitive

`/spwnr-plan`
- align a general task, load `spwnr-principle` plus `spwnr-plan` with `Skill`, ask only material decisions with `AskUserQuestion`, track blockers with `TodoWrite`, write the plan to revision 1 at `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md`, or the next `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` file when a material re-plan occurs, upgrade `Detailed Plan` into orchestration-ready `Execution Units`, run a planning expert sequence `research -> draft -> review` with `resolve-workers` plus planning-only `Agent`, record `Expert Planning Round` and `Plan Review Loop`, and immediately ask whether to `Execute current plan`, `Continue improving plan`, or `End this round`; if the planning expert loop cannot form a viable lineup, stop with `Worker Readiness Required` and send the user to `/spwnr-worker-audit`

`/spwnr-task`
- run the same planning gate first for approved general-task work, then after the current run receives `Execute current plan` read the latest active revision, validate executable units plus the planned execution mode, append `Approved Execution Spec`, resolve registry candidates plus per-unit coverage, and route execution into `skills/spwnr-task/task-pipeline.md` or `skills/spwnr-task/task-team.md`

`/spwnr-worker-audit`
- inspect dynamic registry readiness, local registry state, install or inject suggestions, and the next recovery step when normal lineup resolution for general-task workflows looks unhealthy

## Execution Modes

After approval, `/spwnr-task` routes based on the plan:

- `pipeline` for ordered staged handoff such as writer -> reviewer -> publisher
- `team` for shared-queue parallel work or when the approved plan should launch multiple pipelines in parallel
- `pipeline` does not require Claude team features

## What This Does Not Do

- publish the plugin through `spwnr`
- generate marketplace artifacts from `spwnr`
- add a new `ClaudePlugin` package kind to Spwnr
- bundle worker agents inside the plugin itself

## Notes

- The marketplace config is committed as static JSON in `.claude-plugin/marketplace.json`.
- `.claude/do/` is the runtime artifact directory for lightweight `/spwnr-do` notes and should not be committed.
- `.claude/plans/` is the runtime artifact directory for persisted workflow plan revisions and should not be committed.
- `/spwnr-task` now routes on Claude-native `Read`, `Write`, `Edit`, `Agent`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, `SendMessage`, and `TeamDelete`, with runtime agent selection coming from `resolve-workers`.
- execution tasks should now carry `Owner`, `Files`, `Claim-Policy`, `Risk`, and `Plan-Approval` fields so runtime hooks can enforce teammate boundaries and risky-unit approval gates.
- The plugin can still auto-inject selected local packages for baseline flows, but already-injected project or user agents mainly improve `/spwnr-worker-audit` audit visibility.
- The local registry is the source of truth for runtime lineup selection. Vendored templates are not selectable there until `sync-registry` publishes them locally.
- The execution permission signal is conversational and current-run only; the review loop choice `Execute current plan` unlocks delegation, while `Continue improving plan` keeps the controller in revision mode.
- Revision metadata should mark one latest active revision and preserve older plan revisions for audit with `Revision Status: superseded` plus `Superseded By` pointing at the replacement revision file.
- Missing or weak candidate pools are treated as a worker readiness gap, not as a reason to improvise a fallback lineup.
- If `team` prerequisites fail, the controller should stop and ask before any downgrade instead of silently reverting to `pipeline`.
- If `TaskCreate` is blocked, the controller should repair the plan artifact or task metadata and must not continue by directly executing anyway.

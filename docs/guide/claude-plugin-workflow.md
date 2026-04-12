# Claude Plugin Workflow

This repository includes a repo-root Claude Code plugin named `spwnr` that acts as a workflow controller for executable planning plus registry-guided agent, task, and team orchestration.

The plugin is a dogfood asset for this repository. It is not a published Spwnr package. `/spwnr:plan` and `/spwnr:task` rely on Claude-native planning tools plus the local `spwnr` registry for runtime agent selection, while `/spwnr:workers` provides the deeper audit and recovery path. The shared workflow artifact is the latest active revision under `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md` or `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md`.

## What The Plugin Does

The plugin coordinates a plan-first workflow:

1. clarify the request
2. load the planning stack with `Skill`
3. draft and refine the plan until the important details are aligned
4. ask only material decisions with `AskUserQuestion`
5. track blockers and review-loop outcomes with `TodoWrite`
6. inspect repository context with `Read`
7. write or update the latest active plan revision with `Write` or `Edit`
8. run the execution review loop after each write, asking whether to `执行当前计划`, `继续改进计划`, or `结束本轮`
9. if the current run receives `执行当前计划`, read the latest active revision with `Read`, validate executable `Execution Units`, append `Approved Execution Spec` with `Edit`, resolve a candidate pool with `resolve-workers`, and create a fresh task graph with `TaskCreate`
10. validate the queue with `TaskGet` and `TaskList`
11. build an orchestration spec and create a team with `TeamCreate` when `team` or `swarm` mode is required
12. derive only the selected registry-backed agents with `Agent`
13. execute in `single-lane`, `team`, or worktree-isolated `swarm` mode
14. update task state, escalate incidents with `SendMessage` when teams are active, record worktree paths plus selected package names, and tear down the team with `TaskUpdate`, `ExitWorktree`, and `TeamDelete`
15. integrate the final answer

The controller lives in the repo root under:

- `.claude-plugin/`
- `commands/`
- `hooks/`
- `skills/`

## Registry Audit Surface

The agents remain normal Spwnr subagent packages published into the local Spwnr registry. The bundled examples are still useful defaults for `/spwnr:workers` and for optional manual injection:

- `examples/general-researcher`
- `examples/general-executor`
- `examples/general-reviewer`

Dynamic selection can audit other published packages, including synced community templates, as long as they exist in the local registry and support `claude_code`.

`/spwnr:task` uses this same registry selection path directly during normal execution. If lineup resolution fails, `/spwnr:workers` becomes the required recovery step before execution should continue.

## Recommended Setup

1. Load the repo-root plugin in Claude Code with one of these options:

```text
/plugin marketplace add /absolute/path/to/spwnr
/plugin install spwnr@spwnr-dev
```

or for local development:

```bash
claude --plugin-dir /absolute/path/to/spwnr
```

2. Use the workflow commands inside Claude:

- `/spwnr:plan`
- `/spwnr:task`
- `/spwnr:workers`

3. Only if you want the registry audit to see vendored community templates, sync them into the local registry:

```bash
pnpm --filter @spwnr/cli dev -- sync-registry
```

4. Preview dynamic registry candidates for a task:

```bash
pnpm --filter @spwnr/cli dev -- resolve-workers --search "Implement a backend API and review it" --host claude_code --format json
```

5. Inject subagents into Claude Code when you want a fixed baseline immediately:

```bash
pnpm --filter @spwnr/cli dev -- inject general-researcher --host claude_code --scope project
pnpm --filter @spwnr/cli dev -- inject general-executor --host claude_code --scope project
pnpm --filter @spwnr/cli dev -- inject general-reviewer --host claude_code --scope project
```

6. Enable agent teams if you want `team` or `swarm` mode:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

## Command Intent

`/spwnr:plan`
- align the task, load `workflow-foundation` plus `workflow-planning` with `Skill`, ask only material decisions with `AskUserQuestion`, track blockers with `TodoWrite`, write the plan to revision 1 at `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>.md`, or the next `.claude/plans/spwnr-<project-folder-name>-<YYYY-MM-DD>-rN.md` file when a material re-plan occurs, upgrade `Detailed Plan` into orchestration-ready `Execution Units`, record `Plan Review Loop`, and immediately ask whether to `执行当前计划`, `继续改进计划`, or `结束本轮`

`/spwnr:task`
- run the same planning gate first, then after the current run receives `执行当前计划` read the latest active revision, validate executable units, append `Approved Execution Spec`, resolve registry candidates, select the lineup, create a fresh task graph, form a team when needed, derive agents, execute, review, and tear down cleanly

`/spwnr:workers`
- inspect dynamic registry readiness, local registry state, install or inject suggestions, and the next recovery step when normal lineup resolution looks unhealthy

## Execution Modes

After approval, `/spwnr:task` chooses an execution mode based on the plan:

- `single-lane` for mostly sequential work with one execution lane
- `team` for multiple execution units coordinated through the shared task queue
- `swarm` for multiple coordinated specialist passes on one shared output, and only when repository writes can be isolated with `EnterWorktree` / `ExitWorktree`

## What This Does Not Do

- publish the plugin through `spwnr`
- generate marketplace artifacts from `spwnr`
- add a new `ClaudePlugin` package kind to Spwnr
- bundle worker agents inside the plugin itself

## Notes

- The marketplace config is committed as static JSON in `.claude-plugin/marketplace.json`.
- `.claude/plans/` is the runtime artifact directory for persisted workflow plan revisions and should not be committed.
- `/spwnr:task` now runs on Claude-native `Read`, `Write`, `Edit`, `Agent`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TeamCreate`, `SendMessage`, `EnterWorktree`, `ExitWorktree`, and `TeamDelete`, with runtime agent selection coming from `resolve-workers`.
- The plugin can still auto-inject selected local packages for baseline flows, but already-injected project or user agents mainly improve `/spwnr:workers` audit visibility.
- The local registry is the source of truth for runtime lineup selection. Vendored templates are not selectable there until `sync-registry` publishes them locally.
- The execution permission signal is conversational and current-run only; the review loop choice `执行当前计划` unlocks delegation, while `继续改进计划` keeps the controller in revision mode.
- Revision metadata should mark one latest active revision and preserve older plan revisions for audit with `Revision Status: superseded` plus `Superseded By` pointing at the replacement revision file.
- Missing or weak candidate pools are treated as a worker readiness gap, not as a reason to improvise a fallback lineup.
- If worktree setup fails for `swarm`, the controller should stop and ask before any downgrade instead of silently reverting to `single-lane`.
- If `TaskCreate` is blocked, the controller should repair the plan artifact or task metadata and must not continue by directly executing anyway.

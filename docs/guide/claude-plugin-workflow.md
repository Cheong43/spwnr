# Claude Plugin Workflow

This repository now includes a repo-root Claude Code plugin named `spwnr` that acts as a workflow controller for Spwnr worker subagents.

The plugin is a dogfood asset for this repository. It is not a published Spwnr package and it does not change the current `spwnr` registry or CLI surface.

## What The Plugin Does

The plugin coordinates a plan-first workflow:

1. clarify the request
2. draft and refine the plan until the important details are aligned
3. stop for explicit approval if the plan is not yet confirmed
4. verify workers and build an orchestration spec
5. run one shared research pass if needed
6. execute in `single-lane`, `parallel`, or `swarm` mode
7. delegate review
8. integrate the final answer

The controller lives in the repo root under:

- `.claude-plugin/`
- `commands/`
- `hooks/`
- `skills/`

## Worker Packages

The workers remain normal Spwnr subagent packages:

- `examples/general-researcher`
- `examples/general-executor`
- `examples/general-reviewer`

The review role can also fall back to `code-reviewer` for clearly code-focused work.

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

2. Inject the worker subagents into Claude Code:

```bash
pnpm --filter @spwnr/cli dev -- inject general-researcher --host claude_code --scope project
pnpm --filter @spwnr/cli dev -- inject general-executor --host claude_code --scope project
pnpm --filter @spwnr/cli dev -- inject general-reviewer --host claude_code --scope project
```

3. Use the workflow commands inside Claude:

- `/spwnr:plan`
- `/spwnr:task`
- `/spwnr:workers`

## Command Intent

`/spwnr:plan`
- align the task, surface material decisions, and stop in `needs-confirmation` or `approved-plan-ready`

`/spwnr:task`
- run the same planning gate first, then execute only after explicit approval

`/spwnr:workers`
- inspect the configured worker map and show missing agents plus inject commands

## Execution Modes

After approval, `/spwnr:task` chooses an execution mode based on the plan:

- `single-lane` for mostly sequential work
- `parallel` for independent work packages with low coupling
- `swarm` for multiple coordinated executor passes on one shared output

## What This Does Not Do

- publish the plugin through `spwnr`
- generate marketplace artifacts from `spwnr`
- add a new `ClaudePlugin` package kind to Spwnr
- bundle worker agents inside the plugin itself

## Notes

- The marketplace config is committed as static JSON in `.claude-plugin/marketplace.json`.
- The plugin expects worker subagents to exist in project or user `.claude/agents/` directories.
- Plan approval is conversational and thread-local; clear confirmations such as `continue`, `execute`, or `按这个 plan 做` unlock delegation.
- Missing required workers are treated as a stop condition, not as a reason to improvise the missing role.

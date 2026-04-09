# Claude Plugin Workflow

This repository now includes a repo-root Claude Code plugin named `spwnr` that acts as a workflow controller for Spwnr worker subagents.

The plugin is a dogfood asset for this repository. It is not a published Spwnr package and it does not change the current `spwnr` registry or CLI surface.

## What The Plugin Does

The plugin coordinates a fixed workflow:

1. clarify the request
2. write a short plan
3. delegate research
4. delegate execution
5. delegate review
6. integrate the final answer

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
- clarify the task and return a short plan only

`/spwnr:task`
- run the full `research -> execute -> review -> finalize` loop

`/spwnr:workers`
- inspect the configured worker map and show missing agents plus inject commands

## What This Does Not Do

- publish the plugin through `spwnr`
- generate marketplace artifacts from `spwnr`
- add a new `ClaudePlugin` package kind to Spwnr
- bundle worker agents inside the plugin itself

## Notes

- The marketplace config is committed as static JSON in `.claude-plugin/marketplace.json`.
- The plugin expects worker subagents to exist in project or user `.claude/agents/` directories.
- Missing required workers are treated as a stop condition, not as a reason to improvise the missing role.

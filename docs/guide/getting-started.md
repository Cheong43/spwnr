# Getting Started with Spwnr

Spwnr helps you install ready-made agents into tools like Claude Code, Codex, Copilot, and OpenCode.

This guide is for people who want to use agents, not build them.

## Before You Start

- Node.js 22+
- pnpm 9+
- A supported host tool if you want to inject an agent right away

## Install the CLI

```bash
npm i -g @spwnr/cli
spwnr --help
```

If you prefer, you can also run the CLI without a global install:

```bash
npx @spwnr/cli --help
```

## Load the Community Templates

If you are using this repository, initialize the bundled registry first:

```bash
git submodule update --init --recursive
```

Then sync the bundled templates into your local Spwnr library:

```bash
spwnr sync-registry
```

This copies the templates from `vendor/spwnr-registry` into your local Spwnr storage so you can browse and install them.

## Browse What Is Available

List everything currently available in your local library:

```bash
spwnr list
```

Inspect one template before installing it:

```bash
spwnr info code-reviewer
```

`spwnr info` shows the template description, version, and which hosts it supports.

## Install a Template Locally

Install a template into your local Spwnr home:

```bash
spwnr install code-reviewer
```

This stores the template under `~/.spwnr` so Spwnr can reuse it later.

## Add an Agent to Your Tool

Use `inject` to write the host-native agent files for the tool you want to use.

For Claude Code:

```bash
spwnr inject code-reviewer --host claude_code --scope project
```

For Codex:

```bash
spwnr inject code-reviewer --host codex --scope project
```

For GitHub Copilot:

```bash
spwnr inject code-reviewer --host copilot --scope project
```

For OpenCode:

```bash
spwnr inject code-reviewer --host opencode --scope project
```

Project scope writes files into the current repository. User scope writes them into your home-level config for that host.

Typical output locations:

- `claude_code`: `.claude/agents` or `~/.claude/agents`
- `codex`: `.codex/agents` or `~/.codex/agents`
- `copilot`: `.github/agents` or `~/.copilot/agents`
- `opencode`: `.opencode/agents` or `~/.config/opencode/agents`

## Use the Claude Code Plugin

This repository also includes a Claude Code plugin that adds Spwnr workflow commands directly inside Claude Code.

Install it in Claude Code:

```text
/plugin marketplace add Cheong43/spwnr
/plugin install spwnr@spwnr
```

If you want Claude Code to use multi-agent team features, enable them before launching Claude Code:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

After the plugin is installed, you can use these commands inside Claude Code:

- `/spwnr:plan`
- `/spwnr:task`
- `/spwnr:workers`

What they are for:

- `/spwnr:plan` helps you turn a request into a clear execution plan before doing the work.
- `/spwnr:task` routes the approved work into `pipeline` or `team` execution using the available Spwnr agents.
- `/spwnr:workers` checks whether the local agent setup is healthy and helps recover when worker selection fails.

Recommended usage inside Claude Code:

1. Open your project in Claude Code.
2. Run `/spwnr:plan` to clarify the goal and generate a plan.
3. If the plan looks good, continue with `/spwnr:task`.
4. Use Claude team features only when the approved plan selects `team`; `pipeline` can run without them.
4. If Claude cannot find suitable workers or your local setup looks incomplete, run `/spwnr:workers`.

If you want fixed agents to be available in the current project right away, inject them first:

```bash
spwnr inject general-researcher --host claude_code --scope project
spwnr inject general-executor --host claude_code --scope project
spwnr inject general-reviewer --host claude_code --scope project
```

## Preview a Session Payload

If you want to inspect what Spwnr would hand to a host for one session, use `session`:

```bash
spwnr session code-reviewer --host claude_code --format json
```

Or request shell output when the host supports it:

```bash
spwnr session code-reviewer --host copilot --format shell
```

This is useful for debugging or advanced workflows, but most users can stick with `inject`.

## Change Where Spwnr Stores Data

By default, Spwnr stores its local data in `~/.spwnr`.

To use a different location:

```bash
SPWNR_HOME=/custom/path spwnr list
```

This is handy if you want separate sandboxes for testing.

## Typical First Run

```bash
git submodule update --init --recursive
spwnr sync-registry
spwnr list
spwnr info code-reviewer
spwnr install code-reviewer
spwnr inject code-reviewer --host codex --scope project
```

## Troubleshooting

`spwnr: command not found`
- Reinstall with `npm i -g @spwnr/cli`, or run with `npx @spwnr/cli`.

`No registry source found`
- Run the command from this repository, or pass an explicit directory to `spwnr sync-registry <dir>`.

`Package not found`
- Run `spwnr sync-registry` first, then check the package name with `spwnr list`.

`Injection failed`
- Check the package details with `spwnr info <name>` and make sure your target host is listed.

## Next Reading

- [Claude Plugin Workflow](./claude-plugin-workflow.md)

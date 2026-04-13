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

# Getting Started with Spwnr

This guide walks through the current Spwnr product path: define an agent package, validate it, publish it to the local registry, then inject it into a host or compose a session descriptor.

Spwnr does not execute the agent for the host. Claude Code, Codex, Copilot, and OpenCode keep their own scheduling and runtime behavior.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Optional host CLIs only if you want to consume the generated assets immediately in those hosts

## Install

From the monorepo root:

```bash
pnpm install
pnpm build
```

Use the CLI through the workspace script:

```bash
pnpm --filter @spwnr/cli dev -- --help
```

## Available Commands

- `validate <dir>`: validate a package directory
- `publish <dir>`: publish a package to the local registry
- `install <name> [version]`: install a package from the local registry into `SPWNR_HOME`
- `list|ls`: list published packages
- `info <name> [version]`: show package metadata and host support
- `inject <name> [version]`: write host-native static assets
- `session <name> [version]`: compose a temporary session descriptor or shell snippet
- `run <name> [version]`: deprecated; use `inject` or `session`

## Package Structure

The included example package lives at `examples/code-reviewer`:

```text
examples/code-reviewer/
  subagent.yaml
  agent.md
  schemas/            # optional
    input.schema.json
    output.schema.json
    memory.schema.json
  skills/
    universal/
      diff-reader/
        SKILL.md
      repo-navigator/
        SKILL.md
    claude_code/
      diff-reader/
        SKILL.md
    codex/
      diff-reader/
        SKILL.md
```

## Manifest Shape

The mainline manifest is agent-first and injection-first:

```yaml
apiVersion: subagent.io/v0.3
kind: Subagent
metadata:
  name: code-reviewer
  version: 0.1.0
  instruction: Review git diffs and surface concrete, actionable issues.
  description: Review git diff and produce actionable feedback
  authors:
    - name: Spwnr Team
      github: Cheong43
  license: MIT
spec:
  persona:
    role: senior-code-reviewer
    style: systematic
    tone: concise
  agent:
    path: ./agent.md
  schemas:
    input: ./schemas/input.schema.json
    output: ./schemas/output.schema.json
    memory: ./schemas/memory.schema.json
  injection:
    hosts:
      claude_code:
        static:
          enabled: true
          defaultScope: project
        session:
          enabled: true
          defaultScope: user
      codex:
        static:
          enabled: true
          defaultScope: project
        session:
          enabled: true
          defaultScope: project
  skills:
    universal:
      - name: diff-reader
        path: ./skills/universal/diff-reader
      - name: repo-navigator
        path: ./skills/universal/repo-navigator
    hosts:
      claude_code:
        - name: diff-reader
          path: ./skills/claude_code/diff-reader
      codex:
        - name: diff-reader
          path: ./skills/codex/diff-reader
  compatibility:
    hosts:
      - claude_code
      - codex
      - copilot
      - opencode
  dependencies:
    packages:
      - ecosystem: binary
        name: git
      - ecosystem: npm
        name: gh
        versionRange: ^2.0.0
```

Notes:

- `metadata.instruction` is required and must be between 1 and 400 Unicode characters.
- `spec.agent.path` is required and points to the canonical `agent.md` prompt asset.
- `spec.schemas` is optional. Declare only the schemas you actually ship.
- `spec.injection.hosts` declares which hosts support static and session injection.
- `spec.skills.universal` is the host-neutral baseline; `spec.skills.hosts.<host>` overrides same-named skills for that host.
- Put host-specific tool binding notes directly inside the matching `SKILL.md` files instead of in structured manifest fields.
- `metadata.authors` captures maintainers for registry presentation and review handoff.
- `spec.dependencies.packages` captures structured dependency metadata for package consumers.
- `compatibility.hosts` uses host names, not runtime names.

## Validate

Validate the example package:

```bash
pnpm --filter @spwnr/cli dev -- validate examples/code-reviewer
```

Strict validation also parses the referenced JSON schema files:

```bash
pnpm --filter @spwnr/cli dev -- validate examples/code-reviewer --strict
```

Expected output:

```text
✓ code-reviewer@0.1.0 is valid
```

## Publish

Publish the package to the local registry:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- publish examples/code-reviewer
```

Expected output:

```text
✓ Published code-reviewer@0.1.0
  Signature: <hash>
  Tarball: /tmp/spwnr-demo/tarballs/code-reviewer/0.1.0.tar.gz
```

## Inspect Published Packages

List packages:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- list
```

Inspect package metadata and host support:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- info code-reviewer
```

Typical `info` output includes the host matrix:

```text
Name:      code-reviewer
Version:   0.1.0
Instruction: Review git diffs and surface concrete, actionable issues.
Schemas:   input, output, memory
Tarball:   /tmp/spwnr-demo/tarballs/code-reviewer/0.1.0.tar.gz
Hosts:
  claude_code: static(project), session(user)
  codex: static(project), session(project)
  copilot: static(project), session(user)
  opencode: static(project), session(project)
```

## Install Into Spwnr Home

`install` extracts the published package into `SPWNR_HOME`:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- install code-reviewer
```

This is useful when you want a local package copy under `~/.spwnr/packages/...`, but it is not the same thing as host injection.

## Static Injection

Use `inject` when you want Spwnr to write host-native files into a project or user scope.

Claude Code example:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- inject code-reviewer --host claude_code --scope project
```

This writes a markdown agent file under `.claude/agents/`.

Codex example:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- inject code-reviewer --host codex --scope project
```

This writes a Codex custom agent file under `.codex/agents/code-reviewer.toml`.

Host targets:

- `claude_code`: `.claude/agents` or `~/.claude/agents`
- `copilot`: `.github/agents` or `~/.copilot/agents`
- `opencode`: `.opencode/agents` or `~/.config/opencode/agents`
- `codex`: `.codex/agents` or `~/.codex/agents`

You can override the output location with `--target <dir>`.

## Session Composition

Use `session` when you want temporary injection data for a single host session.

Claude Code JSON bundle:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- session code-reviewer --host claude_code --format json
```

Copilot shell snippet:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- session code-reviewer --host copilot --format shell
```

Current session outputs by host:

- `claude_code`: JSON bundle compatible with `claude --agents`
- `copilot`: temporary profile descriptor or shell snippet
- `opencode`: overlay or descriptor JSON
- `codex`: preview-only descriptor, not runtime execution

## Storage

By default, Spwnr stores local data in `~/.spwnr`:

- SQLite DB: `~/.spwnr/sqlite/spwnr.db`
- Tarballs: `~/.spwnr/tarballs/<name>/<version>.tar.gz`
- Installed packages: `~/.spwnr/packages/<name>/<version>`

Override the storage root with `SPWNR_HOME`:

```bash
SPWNR_HOME=/custom/path pnpm --filter @spwnr/cli dev -- list
```

This rename is a hard cut. Spwnr does not read older names or older home directories.

## Common Tasks

Publish and inject in one isolated sandbox:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- publish examples/code-reviewer
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- inject code-reviewer --host opencode --scope project
```

Preview a Claude session payload:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- session code-reviewer --host claude_code --format json
```

Generate a Copilot shell snippet:

```bash
SPWNR_HOME=/tmp/spwnr-demo pnpm --filter @spwnr/cli dev -- session code-reviewer --host copilot --format shell
```

## Troubleshooting

`Cannot find module @spwnr/...`
- Run `pnpm install` and `pnpm build` at the workspace root.

`Package not found`
- Publish it first with `publish <dir>`.
- Confirm you are reading the expected registry by checking `SPWNR_HOME`.

`Injection failed`
- Check that the package declares the target host under `spec.compatibility.hosts`.
- Check that `spec.injection.hosts.<host>` is enabled for the requested mode.

`run` command no longer works
- This is expected. `spwnr run` is deprecated and only remains as a pointer to `inject` and `session`.

## Next Reading

- [Spwnr PRD and TDD](../../Spwnr-PRD-AND-TDD.md)
- [M1/M2 design notes](../superpowers/specs/2026-04-07-spwnr-m1-m2-design.md)
- [M3/M4/M5 design notes](../superpowers/specs/2026-04-07-spwnr-m3-m4-m5-design.md)
- [Code reviewer example](../../examples/code-reviewer)

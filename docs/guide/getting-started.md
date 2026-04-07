# Getting Started with Orchex

Welcome to Orchex, a cross-runtime subagent platform. This guide walks you through installing, validating, publishing, and running subagent packages.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 22+** — required for the CLI and development
- **pnpm 9+** — workspace package manager
- **(Optional) OpenCode CLI** — if you plan to run packages with the OpenCode backend
- **(Optional) Claude CLI** — if you plan to run packages with the Claude Code backend
- **Simulated backend** — always available for testing (no CLI installation needed)

## Installation

### From the Monorepo

If you're working with the Orchex codebase locally:

```bash
# Install dependencies
pnpm install

# Build the workspace
pnpm build
```

Then use the CLI:

```bash
node apps/orchex-cli/dist/cli.js --help
```

### Available Commands

The Orchex CLI provides the following commands:

- `validate <dir>` — Validate a subagent package directory
- `publish <dir>` — Publish a package to the local registry
- `install <name> [version]` — Install a package from the local registry
- `list|ls` — List all published packages
- `info <name> [version]` — Show package details
- `run <name> [version]` — Run a subagent package

## Your First Subagent Package

Let's explore the included `code-reviewer` example to understand the package structure.

### Package Layout

```
examples/code-reviewer/
├── subagent.yaml           # Package manifest
├── prompts/
│   └── system.md           # System prompt for the subagent
├── workflow/
│   └── main.yaml           # Workflow definition
├── schemas/
│   ├── input.schema.json   # Input validation schema
│   ├── output.schema.json  # Output schema
│   └── memory.schema.json  # Memory state schema
└── skills/
    ├── diff-reader/        # Skill for reading diffs
    └── repo-navigator/     # Skill for navigating repos
```

### Manifest Structure

The `subagent.yaml` manifest declares the package metadata, capabilities, and compatibility:

```yaml
apiVersion: subagent.io/v0.1
kind: Subagent
metadata:
  name: code-reviewer
  version: 0.1.0
  description: Review git diff and produce actionable feedback
  tags:
    - code-review
    - git
spec:
  persona:
    role: senior-code-reviewer
    style: systematic
    tone: concise
  input:
    schema: ./schemas/input.schema.json
  output:
    schema: ./schemas/output.schema.json
  workflow:
    entry: main
  skills:
    refs:
      - name: diff-reader
        path: ./skills/diff-reader
      - name: repo-navigator
        path: ./skills/repo-navigator
  tools:
    allow:
      - git.diff
      - fs.read
      - fs.glob
    ask:
      - bash.exec
    deny:
      - network.*
  memory:
    scope: repo
    schema: ./schemas/memory.schema.json
  compatibility:
    hosts:
      - opencode
      - claude_code
    mode: cross_host
  artifacts:
    - report
    - patch
  modelBinding:
    mode: injectable
    defaultProvider: local_host
    defaultModel: null
    allowOverride: true
```

## Validate a Package

Before publishing or running a package, validate its structure and manifest:

```bash
node apps/orchex-cli/dist/cli.js validate examples/code-reviewer
```

For strict validation (including JSON schema parsing):

```bash
node apps/orchex-cli/dist/cli.js validate examples/code-reviewer --strict
```

**Expected output:**
```
✓ code-reviewer@0.1.0 is valid
```

## Publish a Package

Publish a validated package to your local registry:

```bash
node apps/orchex-cli/dist/cli.js publish examples/code-reviewer
```

**Expected output:**
```
✓ Published code-reviewer@0.1.0
  Signature: <hash>
  Tarball: ~/.orchex/tarballs/code-reviewer/0.1.0.tar.gz
```

## List Packages

View all published packages in your local registry:

```bash
node apps/orchex-cli/dist/cli.js list
```

**Expected output:**
```
code-reviewer (latest: 0.1.0)
  - 0.1.0
```

## Get Package Info

View detailed information about a published package:

```bash
node apps/orchex-cli/dist/cli.js info code-reviewer
```

Or for a specific version:

```bash
node apps/orchex-cli/dist/cli.js info code-reviewer 0.1.0
```

**Expected output:**
```
Name:      code-reviewer
Version:   0.1.0
Published: 2024-04-07T15:53:00Z
Signature: <hash>
Tarball:   ~/.orchex/tarballs/code-reviewer/0.1.0.tar.gz
```

## Run a Subagent

Execute a published package with different backends. The `run` command accepts input JSON and a backend type.

### Simulated Backend (For Testing)

The simulated backend is always available and emulates package execution without requiring external CLI tools. Great for testing and CI pipelines:

```bash
node apps/orchex-cli/dist/cli.js run code-reviewer --backend simulated
```

With input:

```bash
node apps/orchex-cli/dist/cli.js run code-reviewer \
  --backend simulated \
  --input '{"filePath":"./src/main.ts"}'
```

**Expected output:**
```
Running code-reviewer...
Run <run-id>
Status: COMPLETED
Artifacts: report, patch
```

### OpenCode Backend

To run with the OpenCode backend, first install the OpenCode CLI (see [OpenCode documentation](https://github.com/open-code-dev/opencode)):

```bash
node apps/orchex-cli/dist/cli.js run code-reviewer --backend opencode
```

### Claude Code Backend

To run with the Claude Code backend, first install the Claude CLI:

```bash
node apps/orchex-cli/dist/cli.js run code-reviewer --backend claude_code
```

### Run Status and Artifacts

The run command returns:

- **Run ID** — Unique identifier for tracking the run
- **Status** — Current execution state (CREATED, RUNNING, COMPLETED, FAILED, etc.)
- **Artifacts** — Generated outputs (reports, patches, etc.)

## Backend Setup

### OpenCode

If you want to use the OpenCode backend for your runs:

1. Install the OpenCode CLI following the [official documentation](https://github.com/open-code-dev/opencode)
2. Run packages with `--backend opencode`

The Orchex CLI will automatically delegate execution to the OpenCode runtime.

### Claude Code

If you want to use the Claude Code backend:

1. Install the Claude CLI following the [official documentation](https://claude.ai)
2. Run packages with `--backend claude_code`

### Simulated Backend (Development)

The **Simulated Backend** is built into Orchex and always available. It:

- Emulates package execution without external dependencies
- Emits `run.started` and `run.completed` events
- Returns mock artifacts
- Is ideal for testing, CI pipelines, and development

No additional setup is required. Use `--backend simulated` to test packages locally.

## Registry Storage

By default, Orchex stores packages in `~/.orchex`:

- **SQLite DB:** `~/.orchex/sqlite/orchex.db`
- **Tarballs:** `~/.orchex/tarballs/<name>/<version>.tar.gz`
- **Installed packages:** `~/.orchex/packages/<name>/<version>`

Override the registry location with the `ORCHEX_HOME` environment variable:

```bash
ORCHEX_HOME=/custom/path node apps/orchex-cli/dist/cli.js list
```

## Manifest Reference

Quick reference for key fields in `subagent.yaml`:

### Metadata
- `name` — Package name (must be unique in the registry)
- `version` — Semantic version (e.g., `0.1.0`)
- `description` — Human-readable description
- `tags` — List of tags for categorization

### Spec
- `persona` — Agent role, style, and tone
- `input` — Path to input schema JSON
- `output` — Path to output schema JSON
- `workflow.entry` — Name of the entry workflow (e.g., `main`)

### Skills
- `skills.refs` — References to local skills with `name` and `path`

### Tools and Permissions
- `tools.allow` — Tools the package can use freely (e.g., `git.diff`, `fs.read`)
- `tools.ask` — Tools that require user approval (e.g., `bash.exec`)
- `tools.deny` — Tools that are forbidden (e.g., `network.*`)

### Compatibility
- `compatibility.hosts` — List of supported hosts (e.g., `opencode`, `claude_code`)
- `compatibility.mode` — `cross_host` or host-specific mode
- `compatibility.badges` — Explicit host compatibility labels

### Memory
- `memory.scope` — Scope for memory state (e.g., `repo`, `session`)
- `memory.schema` — Path to memory schema JSON

### Artifacts
- `artifacts` — List of expected artifact types (e.g., `report`, `patch`)

### Model Binding
- `modelBinding.mode` — `injectable` or `fixed`
- `modelBinding.allowOverride` — Whether the host can override the default model
- `modelBinding.defaultProvider` — Default model provider (e.g., `local_host`)

## Next Steps

- **Explore the example:** Review `examples/code-reviewer` to understand a complete working package
- **Use `info` command:** Run `orchex info code-reviewer` to see package metadata
- **Install packages:** Use `orchex install code-reviewer` to set up packages for running
- **Create your own package:** Follow the manifest structure and place your workflows, schemas, and skills in the appropriate directories
- **Read the full PRD:** See [Orchex-PRD-AND-TDD.md](../../Orchex-PRD-AND-TDD.md) for detailed architecture and design notes

## Common Tasks

### Validate with Strict Mode
```bash
node apps/orchex-cli/dist/cli.js validate examples/code-reviewer --strict
```

### Publish to a Custom Registry Location
```bash
ORCHEX_HOME=/tmp/test-registry \
  node apps/orchex-cli/dist/cli.js publish examples/code-reviewer
```

### Run with Custom Input
```bash
node apps/orchex-cli/dist/cli.js run code-reviewer \
  --backend simulated \
  --input '{"path":"./src","maxFiles":10}'
```

### List Packages in Custom Registry
```bash
ORCHEX_HOME=/tmp/test-registry \
  node apps/orchex-cli/dist/cli.js list
```

## Troubleshooting

**"Cannot find module @orchex/..." error**
- Run `pnpm install` and `pnpm build` in the workspace root

**"Package not found" when running**
- Ensure you've published the package: `orchex publish <dir>`
- Check your registry location: `ORCHEX_HOME` or `~/.orchex`

**Validation fails with missing files**
- Verify all paths in the manifest are relative to the package directory
- Ensure schema files are valid JSON and workflow files are valid YAML

## Resources

- [Orchex Repository](https://github.com/your-org/orchex)
- [PRD and Design Docs](../../Orchex-PRD-AND-TDD.md)
- [Code Reviewer Example](../../examples/code-reviewer)

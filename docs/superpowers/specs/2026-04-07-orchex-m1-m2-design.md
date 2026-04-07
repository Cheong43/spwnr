# Orchex M1 + M2 Design Spec

**Date:** 2026-04-07  
**Scope:** M1 (Protocol Definition) + M2 (Registry & Publish/Install)  
**Status:** Approved  

---

## Problem Statement

Orchex is a cross-runtime Subagent platform that unifies how AI coding agents (Claude Code, OpenCode, Codex, Cline, OpenClaw) define, distribute, and execute capability packages. The PRD + TDD (v0.1) defines the full platform vision.

This spec covers **M1 + M2 only**:
- M1: Subagent Manifest schema, package directory convention, validation tooling
- M2: Local registry (SQLite + FS), CLI publish/install, version management, hash-based signing

---

## Approach

Progressive monorepo (pnpm workspaces), foundation-first. Each package is independently testable. Dependency graph flows: `core-types` → `manifest-schema` → `registry` → `apps/cli`.

Stack: Node.js + TypeScript + SQLite (better-sqlite3) + Commander (CLI) + Zod (validation) + Vitest (tests). No HTTP API in M1+M2 — local-only via CLI.

---

## Repository Structure

```
orchex/
  apps/
    cli/                      ← CLI entry point (bin: orchex)
      src/
        commands/
          validate.ts
          publish.ts
          install.ts
          list.ts
          info.ts
        index.ts
      package.json
  packages/
    core-types/               ← Shared TS interfaces, enums, error codes (zero deps)
      src/
        manifest.ts           ← SubagentManifest, WorkflowStep, ToolPolicy, etc.
        run.ts                ← RunRecord, CheckpointRecord, RunEvent, RunStatus
        enums.ts              ← BackendType, EventType, PolicyDecision
        errors.ts             ← Error code constants
      package.json
    manifest-schema/          ← JSON Schema + Zod validators + package loader
      src/
        schema/
          manifest.schema.json
        manifest-validator.ts ← Validates a SubagentManifest object with Zod
        package-loader.ts     ← Reads directory, parses subagent.yaml, resolves refs
        package-validator.ts  ← Validates full package directory layout
      package.json
    registry/                 ← Local SQLite + FS registry module
      src/
        db/
          schema.ts           ← SQLite table definitions and migrations
          package-store.ts    ← CRUD for packages + package_versions
        fs/
          tarball-service.ts  ← Creates/extracts .tgz packages
          artifact-paths.ts   ← Path helpers for ~/.orchex layout
        signature-service.ts  ← SHA-256 hash-based signing + verification
        registry-service.ts   ← Orchestrates validate → sign → tarball → store
      package.json
  examples/
    code-reviewer/            ← Reference subagent package
      subagent.yaml
      prompts/
        system.md
      workflow/
        main.yaml
      schemas/
        input.schema.json
        output.schema.json
        memory.schema.json
      skills/
        diff-reader/
          SKILL.md
        repo-navigator/
          SKILL.md
  infra/
    scripts/
      setup.sh
  package.json                ← pnpm workspace root
  tsconfig.base.json
  vitest.workspace.ts
```

---

## Package Responsibilities

### `core-types`

Pure TypeScript interfaces exported directly from the TDD (T5). No runtime dependencies.

Key exports:
- `SubagentManifest` — full manifest interface with all spec fields
- `WorkflowStep` — step definition
- `ToolPolicy`, `PermissionPolicy`, `PolicyDecision` — permission model
- `BackendType` — `'opencode' | 'claude_code' | 'openclaw' | 'codex' | 'cline'`
- `RunRecord`, `RunStatus`, `CheckpointRecord`, `RunEvent`, `EventType`
- Error code constants: `MANIFEST_INVALID`, `PACKAGE_NOT_FOUND`, `WORKFLOW_INVALID`, etc.

### `manifest-schema`

Runtime validation layer. Depends on `core-types`.

- **`manifest.schema.json`** — JSON Schema draft-07 for `subagent.yaml`, covering all fields in `SubagentManifest`
- **`ManifestValidator`** — takes a parsed JS object, validates against Zod schema, returns `{ success: true, data: SubagentManifest }` or `{ success: false, errors: ValidationError[] }`
- **`PackageLoader`** — reads a package directory: finds `subagent.yaml` or `subagent.json`, parses YAML/JSON, resolves relative `schema` file references (verifies they exist on disk), returns a `LoadResult`
- **`PackageValidator`** — checks the full directory structure: required files present (`subagent.yaml`, `schemas/input.schema.json`, `schemas/output.schema.json`), validates referenced skill paths exist, validates workflow entry file exists

### `registry`

Local registry module. Depends on `manifest-schema` + `core-types`.

**SQLite schema** (at `~/.orchex/sqlite/orchex.db`):

```sql
CREATE TABLE packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  latest_version TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE package_versions (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id),
  version TEXT NOT NULL,
  spec_blob TEXT NOT NULL,
  signature TEXT NOT NULL,
  tarball_uri TEXT NOT NULL,
  compatibility TEXT NOT NULL,
  skill_refs TEXT NOT NULL,
  model_binding_blob TEXT,
  manifest_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(package_id, version)
);
```

**File layout** (all under `~/.orchex/`):
```
packages/{name}/{version}/   ← extracted package files after install
tarballs/{name}-{version}.tgz ← original tarballs from publish
```

**Services:**
- `PackageStore` — typed wrappers around better-sqlite3 for all package queries
- `TarballService` — uses `tar` npm package to create `.tgz` from directory; extract to dest dir
- `SignatureService` — computes `sha256(manifest_json_string)` as hex signature; `verify(manifest, signature)` recomputes and compares
- `RegistryService` — public API:
  - `publish(packageDir)` → validate → compute hash/signature → tarball → store in SQLite + FS
  - `install(name, version?, destDir?)` → resolve version → verify signature → extract tarball
  - `list()` → returns all packages with latest version + compatibility
  - `info(name, version?)` → returns full package version record
  - `resolve(name, version?)` → resolves `latest` or exact version

### `apps/cli`

Commander-based CLI. Depends on `registry` + `manifest-schema`.

```bash
orchex validate <path>              # PackageValidator + ManifestValidator
orchex validate <path> --strict     # also validate referenced JSON schema files

orchex publish <path>               # RegistryService.publish()
orchex install <name[@version]>     # RegistryService.install()
orchex list                         # RegistryService.list()
orchex info <name[@version]>        # RegistryService.info()
```

**Output format:**
- Success: green checkmark + summary
- Errors: red `✖ ERROR_CODE: message` per error, with file path context where applicable
- `--json` flag on all commands for machine-readable output

---

## Data Flow

### `orchex validate ./examples/code-reviewer`

```
CLI → PackageLoader.load(dir)
    → reads subagent.yaml
    → ManifestValidator.validate(parsed)
    → PackageValidator.validateLayout(dir, manifest)
    → prints errors or "✔ Valid"
```

### `orchex publish ./examples/code-reviewer`

```
CLI → RegistryService.publish(dir)
    → PackageLoader.load(dir)         [validate first]
    → ManifestValidator.validate()
    → SignatureService.sign(manifest)  [sha256 hash]
    → TarballService.pack(dir)         [creates .tgz]
    → PackageStore.upsert(...)         [SQLite write]
    → copies tarball to ~/.orchex/tarballs/
    → prints "✔ Published code-reviewer@0.1.0"
```

### `orchex install code-reviewer@0.1.0`

```
CLI → RegistryService.install("code-reviewer", "0.1.0")
    → PackageStore.findVersion(name, version)
    → SignatureService.verify(manifest, signature)   [integrity check]
    → TarballService.extract(tarball, destDir)
    → prints "✔ Installed to ~/.orchex/packages/code-reviewer/0.1.0/"
```

---

## Error Handling

- All `RegistryService` methods throw typed `OrchexError` with `code` (from error code constants) + `message` + optional `details`
- CLI catches `OrchexError` and formats structured output; unknown errors show generic message + suggest `--debug`
- `--debug` flag on CLI enables full stack trace output

---

## Testing Strategy

**Unit tests** (`packages/*/src/**/*.test.ts`):
- `manifest-schema`: 10+ cases — valid manifest, missing required fields, invalid enum values, unknown hosts, workflow entry missing
- `registry/signature-service`: sign → verify → tamper → fails verification
- `registry/registry-service`: mock PackageStore + TarballService

**Integration tests** (`packages/registry/tests/integration/`):
- Uses a temp directory for `ORCHEX_HOME` override
- Full cycle: `publish(exampleDir)` → `list()` → `info()` → `install()` → verify extracted files match source

**CLI integration tests** (`apps/cli/tests/`):
- Spawns `orchex` binary with `execa`, checks stdout + exit codes

---

## Example Package (`examples/code-reviewer`)

A complete reference subagent demonstrating all manifest fields, two stub skills, proper schema files, and a minimal workflow definition. Used as the primary test fixture throughout M1+M2.

---

## Configuration

- `ORCHEX_HOME` env var overrides `~/.orchex/` (used in tests)
- `ORCHEX_DEBUG=1` enables verbose logging

---

## Out of Scope (deferred to M3+)

- Runtime Broker, Policy Engine, Memory/State (M3)
- Host adapters: OpenCode, Claude Code (M4)
- HTTP API / local daemon (post-M2)
- Remote registry / team sharing (post-MVP)
- Web UI, billing, complex DAG orchestration

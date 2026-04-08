# Spwnr M1 + M2 Design Spec

**Date:** 2026-04-07  
**Scope:** M1 (Protocol Definition) + M2 (Registry, Publish, Install)  
**Status:** Updated for the injection-first product line

---

## Summary

M1 + M2 define the stable substrate under the current Spwnr product:

- a host-oriented manifest contract
- package layout validation
- a local registry with publish, list, info, resolve, and install
- storage conventions rooted at `SPWNR_HOME` / `~/.spwnr`

These milestones intentionally stop before runtime execution. Their job is to make agent packages portable, versioned, and verifiable.

---

## Repository Slice

```text
apps/
  spwnr-cli/
    src/commands/
      validate.ts
      publish.ts
      install.ts
      list.ts
      info.ts

packages/
  core-types/
  manifest-schema/
  registry/
```

Dependency flow:

```text
core-types -> manifest-schema -> registry -> spwnr-cli
```

---

## M1: Protocol Definition

### Goals

- establish a single package manifest format
- shift product vocabulary from runtime/backend to host/injection
- make prompt and host compatibility first-class

### Key Types

`packages/core-types` exports the mainline contract:

- `HostType = 'claude_code' | 'codex' | 'copilot' | 'opencode'`
- `HostScope = 'project' | 'user'`
- `SubagentManifest`
- `InjectionHosts`
- shared errors and enums

### Manifest Shape

Mainline manifest fields:

- `metadata.name`
- `metadata.version`
- `metadata.instruction`
- `metadata.description`
- `spec.persona`
- `spec.agent.path`
- `spec.schemas`
- `spec.injection.hosts`
- `spec.skills.universal`
- `spec.skills.hosts`
- `spec.tools`
- `spec.memory`
- `spec.compatibility.hosts`
- `spec.artifacts`
- `spec.modelBinding`

### Validation Rules

`packages/manifest-schema` enforces:

- `metadata.instruction` is required
- `spec.agent.path` is required
- the referenced `agent.md` file exists
- declared schema files exist when present
- skill refs resolve on disk
- host compatibility only allows mainline hosts
- `spec.injection.hosts.<host>` follows the static/session shape

Rejected from the mainline surface:

- `simulated`
- `openclaw`
- `cline`

Those names may still exist in deprecated internal code, but not in mainline packages.

---

## M2: Registry And Install

### Goals

- make packages publishable and versioned
- preserve manifest and tarball integrity
- support local install into `SPWNR_HOME`

### Storage Model

Root:

- `SPWNR_HOME` if set
- otherwise `~/.spwnr`

Registry data:

- SQLite DB: `~/.spwnr/sqlite/spwnr.db`
- Tarballs: `~/.spwnr/tarballs/<name>/<version>.tar.gz`
- Installed packages: `~/.spwnr/packages/<name>/<version>`

No compatibility fallback is provided for older names or older directories.

### Registry Responsibilities

`packages/registry` provides:

- `publish(packageDir)`
- `install(name, version?, destDir?)`
- `resolve(name, version?)`
- `list()`
- `info(name, version?)`

### Publish Flow

```text
CLI
 -> PackageLoader.load(dir)
 -> ManifestValidator.validate(manifest)
 -> PackageValidator.validateLayout(dir, manifest)
 -> SignatureService.sign(manifest)
 -> TarballService.pack(dir)
 -> PackageStore.upsert(...)
```

### Install Flow

```text
CLI
 -> RegistryService.install(name, version?)
 -> PackageStore.findVersion(...)
 -> SignatureService.verify(...)
 -> TarballService.extract(...)
```

---

## CLI Surface In M1 + M2

```bash
spwnr validate <dir>
spwnr validate <dir> --strict
spwnr publish <dir>
spwnr install <name> [version]
spwnr list
spwnr info <name> [version]
```

`info` is especially important in the new product line because it surfaces host injection support, not runtime execution support.

---

## Example Package Expectations

`examples/code-reviewer/subagent.yaml` is the reference package.

It demonstrates:

- required `metadata.instruction`
- required `spec.agent.path`
- `spec.injection.hosts` declarations
- host compatibility for Claude Code, Codex, Copilot, and OpenCode
- local skills, schemas, memory, artifacts, and model binding metadata

---

## Tests

M1 + M2 coverage includes:

- manifest enum and type tests
- manifest validation tests
- package loader tests
- package layout validation tests
- registry integration tests for publish/install/info/list

---

## Outcome

After M1 + M2, Spwnr has a stable package definition and distribution layer. That foundation is what the injector and host-adapter work in later milestones now builds on.

# Spwnr M3 + M4 + M5 Design Spec

**Date:** 2026-04-07  
**Status:** Updated for the injection-first product line  
**Scope:** Injector, Host Adapters, CLI Injection Commands, Compatibility Docs

---

## Summary

M3 + M4 + M5 originally explored runtime execution. The current product line narrows that scope:

- no host runtime is implemented
- host adapters compile package assets only
- the injector is the main orchestration layer
- CLI exposure moves from `run` to `inject` and `session`

Deprecated runtime seed code may remain in the repo, but it is not part of the supported product path.

---

## Package Structure

```text
packages/
  adapters/    host adapters for Claude Code, Codex, Copilot, OpenCode
  injector/    static injection and session composition
  policy/      dormant extension interfaces
  broker/      deprecated internal runtime seed
  memory/      deprecated internal runtime seed

apps/spwnr-cli/
  src/commands/inject.ts
  src/commands/session.ts
  src/commands/run.ts
```

---

## Injector Design

`packages/injector` is now the mainline orchestration layer.

Public API:

```ts
injectStatic(options): Promise<InjectResult>
composeSession(options): Promise<SessionResult>
resolveDefaultStaticTarget(host, scope): string
```

Responsibilities:

- resolve a package from the registry
- read the manifest and prompt assets
- choose a host adapter
- emit host-native files or session payloads

It does not:

- start a host process
- simulate execution
- maintain a unified run lifecycle

---

## Host Adapter Contract

`packages/adapters` now implements a host-oriented contract:

```ts
interface HostAdapter {
  host: HostType
  supports(mode: 'static' | 'session'): boolean
  compile(manifest: SubagentManifest): CompiledHostAsset
  materializeStatic(compiled: CompiledHostAsset, targetDir: string): Promise<MaterializedFile[]>
  composeSession(compiled: CompiledHostAsset, context: SessionContext): Promise<SessionOutput>
}
```

Key decision:

- `composeSession()` returns JSON, overlays, or shell snippets only
- adapters do not spawn CLIs or take over scheduling

---

## Host Output Mapping

### Static

- Claude Code: `.claude/agents/*.md`
- Copilot: `.github/agents/*.agent.md`
- OpenCode: `.opencode/agents/*.md`
- Codex: `.codex/skills/<name>/SKILL.md` plus metadata

### Session

- Claude Code: `claude --agents` JSON bundle
- Copilot: shell snippet or temporary profile descriptor
- OpenCode: overlay or descriptor JSON
- Codex: preview-only descriptor

### Scope

All hosts use:

- `project`
- `user`

The injector provides default target directory resolution for each host and scope.

---

## CLI Changes

Mainline commands introduced in this milestone set:

```bash
spwnr inject <name> [version] --host <host> --scope project|user [--target <dir>]
spwnr session <name> [version] --host <host> --scope project|user --format json|shell
```

`spwnr info` is also enhanced to print the host injection matrix.

`spwnr run` is intentionally downgraded to a deprecation message and is no longer a real workflow entry point.

---

## Policy Decision

`packages/policy` is no longer an active enforcement engine in the product path.

It only retains dormant interfaces such as:

- `PolicyContext`
- `PolicyExtension`
- `NoopPolicyProvider`

This keeps an extension seam for future agentruntime work without entangling the current CLI surface.

---

## Deprecated Runtime Seed

`packages/broker` and `packages/memory` remain in the repository as internal seed code.

Rules for this code:

- it may exist for future exploration
- it is not exposed on the mainline CLI
- it is not documented as a user-facing feature
- it is not required for static injection or session composition

---

## Tests

Coverage in this milestone set includes:

- host adapter golden tests for Claude Code, Copilot, OpenCode, and Codex
- injector tests for static materialization
- session composition tests for JSON and shell modes
- CLI tests for `inject`, `session`, `info`, and `run` deprecation
- docs and naming updates for `spwnr`

---

## Outcome

After M3 + M4 + M5, Spwnr's supported product surface is:

- package definition
- registry distribution
- host-native static injection
- host session descriptor composition

The platform explicitly leaves execution orchestration to the hosts themselves.

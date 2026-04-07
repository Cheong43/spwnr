# Orchex M3+M4+M5 Design Spec

**Date:** 2026-04-07  
**Status:** Approved  
**Scope:** Runtime Broker (M3), Host Adapters (M4), Compatibility Tests + Docs (M5)

---

## 1. Package Structure

```
packages/
  memory/      — Run state, checkpoints, agent memory, artifact store (SQLite + FS)
  policy/      — 3-level policy merge, EffectivePolicy, backend mappers
  broker/      — RuntimeBroker, BackendSelector, RetryStrategy, state machine
  adapters/    — BackendAdapter interface, SimulatedAdapter, OpenCodeAdapter, ClaudeAdapter

apps/orchex-cli/
  src/commands/run.ts  — orchex run <name> [version] --input --backend --watch

docs/guide/
  getting-started.md  — full walkthrough
```

---

## 2. packages/memory

### Dependencies
- `@orchex/core-types` (RunRecord, CheckpointRecord, RunStatus, ErrorCode)
- `better-sqlite3`, `@orchex/registry` (re-use openDatabase + getOrchexHome)

### SQLite Tables (new migrations)

```sql
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED',
  input_json TEXT NOT NULL,
  output_json TEXT,
  error_json TEXT,
  trace_id TEXT NOT NULL,
  backend TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  state_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_memory (
  id TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(package_name, key)
);

CREATE INDEX IF NOT EXISTS idx_runs_package ON runs(package_name);
CREATE INDEX IF NOT EXISTS idx_checkpoints_run ON checkpoints(run_id);
CREATE INDEX IF NOT EXISTS idx_memory_package ON agent_memory(package_name);
```

### Public API

```typescript
// RunStore
class RunStore {
  create(opts: CreateRunOpts): RunRecord
  updateStatus(runId: string, status: RunStatus, extra?: Partial<RunRecord>): RunRecord
  get(runId: string): RunRecord | null
  list(packageName?: string): RunRecord[]
}

// CheckpointStore  
class CheckpointStore {
  save(runId: string, stepName: string, state: unknown): CheckpointRecord
  load(runId: string, stepName: string): CheckpointRecord | null
  listForRun(runId: string): CheckpointRecord[]
}

// AgentMemoryStore
class AgentMemoryStore {
  set(packageName: string, key: string, value: unknown): void
  get(packageName: string, key: string): unknown | null
  getAll(packageName: string): Record<string, unknown>
  delete(packageName: string, key: string): void
}

// ArtifactStore
class ArtifactStore {
  // Files stored at ORCHEX_HOME/artifacts/{runId}/
  write(runId: string, filename: string, content: string | Buffer): string  // returns full path
  read(runId: string, filename: string): Buffer | null
  list(runId: string): string[]
  getDir(runId: string): string
}
```

### Exports
All 4 classes + their types. Also exports `openRunDatabase(path?)` that adds run/checkpoint/memory migrations on top of registry DB.

---

## 3. packages/policy

### Dependencies
- `@orchex/core-types` (PolicyRule, PolicyDecision, BackendType)
- `yaml` (for reading org-policy.yaml)

### Policy Levels

1. **Package policy** — `manifest.spec.policy.rules[]` (from SubagentManifest)
2. **Org policy** — loaded from `ORCHEX_HOME/config/org-policy.yaml` (optional file)
3. **Request policy** — caller-provided at run invocation time

**Merge rule:** Higher level wins. Within same level, `DENY` wins over `ALLOW`.

### Key Types

```typescript
interface PolicyInput {
  packagePolicy: PolicyRule[]
  orgPolicy?: PolicyRule[]
  requestPolicy?: PolicyRule[]
}

interface EffectivePolicy {
  allowedTools: string[]        // explicit allows
  deniedTools: string[]         // explicit denies (always enforced)
  maxRetries: number            // default 2
  timeoutMs: number             // default 60_000
  requiresApproval: boolean     // any rule has action=ASK
  rawDecisions: Record<string, PolicyDecision>
}
```

### Backend Mappers

```typescript
// Maps EffectivePolicy to OpenCode permissions format
function mapToOpenCode(policy: EffectivePolicy): OpenCodePermissions

// Maps EffectivePolicy to Claude Code permissions format  
function mapToClaudeCode(policy: EffectivePolicy): ClaudePermissions
```

OpenCode permissions: `{ allow: string[], deny: string[] }` keyed by tool name.  
Claude permissions: `{ allowedTools: string[] }` (Claude Code uses allowlist only).

### Public API
`PolicyMerger` class + mapper functions + all types.

---

## 4. packages/broker

### Dependencies
- `@orchex/core-types`
- `@orchex/manifest-schema` (loadPackage)
- `@orchex/registry` (RegistryService)
- `@orchex/memory` (RunStore, CheckpointStore, ArtifactStore)
- `@orchex/policy` (PolicyMerger)
- `@orchex/adapters` (BackendAdapter, AdapterRegistry)

### Run State Machine

```
CREATED → VALIDATED → COMPILED → SCHEDULED → RUNNING
  → WAITING_APPROVAL (optional) → RUNNING
  → RETRYING (optional) → RUNNING  
  → COMPLETED | FAILED | CANCELLED
```

### Key Classes

```typescript
interface RunRequest {
  packageName: string
  version?: string                    // default 'latest'
  input: unknown
  backendPreference?: BackendType
  requestPolicy?: PolicyRule[]
  traceId?: string
}

class RuntimeBroker {
  constructor(deps: BrokerDeps)
  async run(request: RunRequest): Promise<RunRecord>
  async approve(runId: string, decision: ApprovalDecision): Promise<void>
  async cancel(runId: string): Promise<void>
  getRunStatus(runId: string): RunRecord | null
}

class BackendSelector {
  select(manifest: SubagentManifest, available: BackendType[], preference?: BackendType): BackendSelection
}

class RetryStrategy {
  shouldRetry(error: unknown, attempt: number): boolean   // max 2 retries
  getDelayMs(attempt: number): number                      // 1000ms, 3000ms
}

interface BackendSelection {
  backend: BackendType
  reason: string
  fallbackChain: BackendType[]
}
```

### BrokerDeps

```typescript
interface BrokerDeps {
  runStore: RunStore
  checkpointStore: CheckpointStore
  artifactStore: ArtifactStore
  policyMerger: PolicyMerger
  adapterRegistry: AdapterRegistry
  registryService: RegistryService
}
```

---

## 5. packages/adapters

### BackendAdapter Interface (from PRD T8.1)

```typescript
interface BackendAdapter {
  kind(): BackendType
  healthCheck(): Promise<AdapterHealth>
  compile(ctx: CompileContext): Promise<CompiledBundle>
  startRun(input: StartRunInput): Promise<AdapterRunHandle>
  streamEvents(handle: AdapterRunHandle): AsyncIterable<AdapterEvent>
  approve?(handle: AdapterRunHandle, decision: ApprovalDecision): Promise<void>
  cancel(handle: AdapterRunHandle): Promise<void>
  fetchArtifacts?(handle: AdapterRunHandle): Promise<Artifact[]>
}
```

### Supporting Types

```typescript
interface AdapterHealth { available: boolean; version?: string; error?: string }
interface CompileContext { manifest: SubagentManifest; installedDir: string }
interface CompiledBundle { backend: BackendType; data: unknown }
interface AdapterRunHandle { runId: string; backend: BackendType; data: unknown }
interface AdapterEvent {
  type: 'STARTED' | 'TEXT_DELTA' | 'TOOL_CALL' | 'TOOL_RESULT' | 'APPROVAL_REQUIRED' | 'COMPLETED' | 'FAILED'
  data?: unknown
  timestamp: string
}
interface StartRunInput {
  runId: string; traceId: string; manifest: SubagentManifest
  bundle: CompiledBundle; input: unknown; effectivePolicy: EffectivePolicy
}
interface ApprovalDecision { approved: boolean; reason?: string }
interface Artifact { name: string; content: Buffer; mimeType?: string }
```

### AdapterRegistry

```typescript
class AdapterRegistry {
  register(adapter: BackendAdapter): void
  get(kind: BackendType): BackendAdapter | null
  available(): BackendType[]
}
```

### SimulatedAdapter

Fully deterministic, in-process. Config:
```typescript
interface SimulatedAdapterConfig {
  events?: Partial<AdapterEvent>[]    // custom event sequence
  outputJson?: unknown                // final output
  shouldFail?: boolean                // simulate failure
  delayMs?: number                    // artificial delay per event
}
```
Default behavior: emits STARTED → 3× TEXT_DELTA → COMPLETED with `outputJson`.

### OpenCodeAdapter

Attempts to spawn `opencode run` child process. If `opencode` not in PATH: `healthCheck()` returns `{ available: false }`, `startRun()` throws `OrchexError(BACKEND_UNAVAILABLE)`.

### ClaudeAdapter

Attempts to spawn `claude` CLI. Same graceful-unavailable pattern.

---

## 6. CLI orchex run

```
orchex run <name> [version]
  --input <json|@file>    Input JSON or @path/to/file.json
  --backend <type>        Force backend: opencode | claude | simulated
  --watch                 Stream events to stdout in real-time
```

**Output (success):**
```
✓ Run completed: {runId}
  Output: {output JSON}
```

**Output (--watch):**
```
[STARTED] code-reviewer@0.1.0
[TEXT_DELTA] Analyzing diff...
[COMPLETED] Run finished
✓ Run completed: {runId}
```

---

## 7. M5 — Compatibility Tests + Docs

- `packages/broker/src/integration.test.ts` — full cycle: publish → install → run with SimulatedAdapter
- `docs/guide/getting-started.md` — install, validate, publish, run walkthrough

---

## 8. Error Codes to Add

Add to `packages/core-types/src/errors.ts`:
- `BACKEND_UNAVAILABLE` — requested adapter not available
- `INPUT_INVALID` — run input fails manifest input schema  
- `RUN_NOT_FOUND` — runId not found in store
- `RUN_ALREADY_COMPLETED` — trying to approve/cancel a finished run
- `APPROVAL_TIMEOUT` — approval not received within timeout

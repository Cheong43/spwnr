export { AdapterRegistry } from './adapter-registry.js';
export {
  type CompiledHostAgent,
  type HostAdapter,
  type HostAdapterCompileInput,
  type InjectionMode,
  type MaterializedFile,
  type SessionComposition,
  type SessionContext,
  type StaticMaterialization,
  type StaticMaterializationTarget,
} from './host-adapter.js';
export { ClaudeAdapter } from './claude-adapter.js';
export { OpenCodeAdapter } from './opencode-adapter.js';
export { CopilotAdapter } from './copilot-adapter.js';
export { CodexAdapter } from './codex-adapter.js';
export { SimulatedAdapter } from './simulated-adapter.js';

import { ClaudeAdapter } from './claude-adapter.js';
import { CodexAdapter } from './codex-adapter.js';
import { CopilotAdapter } from './copilot-adapter.js';
import { OpenCodeAdapter } from './opencode-adapter.js';
import { AdapterRegistry } from './adapter-registry.js';

export function createDefaultAdapterRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.register(new ClaudeAdapter());
  registry.register(new CodexAdapter());
  registry.register(new CopilotAdapter());
  registry.register(new OpenCodeAdapter());
  return registry;
}

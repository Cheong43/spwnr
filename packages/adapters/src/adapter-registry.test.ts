import { describe, expect, it } from 'vitest';
import { AdapterRegistry } from './adapter-registry.js';
import { ClaudeAdapter } from './claude-adapter.js';

describe('AdapterRegistry', () => {
  it('registers and returns adapters by host', () => {
    const registry = new AdapterRegistry();
    const adapter = new ClaudeAdapter();
    registry.register(adapter);

    expect(registry.get('claude_code')).toBe(adapter);
    expect(registry.require('claude_code')).toBe(adapter);
    expect(registry.getAll()).toHaveLength(1);
  });
});

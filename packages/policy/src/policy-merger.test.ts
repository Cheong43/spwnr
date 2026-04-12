import { describe, expect, it, vi } from 'vitest';
import { NoopPolicyProvider } from './policy-merger.js';

describe('NoopPolicyProvider', () => {
  it('returns registered extensions', () => {
    const provider = new NoopPolicyProvider([{ name: 'example', apply: vi.fn() }]);
    expect(provider.getExtensions()).toHaveLength(1);
  });

  it('applies extensions in order', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const provider = new NoopPolicyProvider([
      { name: 'first', apply: first },
      { name: 'second', apply: second },
    ]);

    await provider.apply({
      host: 'claude_code',
      mode: 'static',
      manifest: {
        apiVersion: 'spwnr/v1',
        kind: 'Subagent',
        metadata: {
          name: 'demo',
          version: '0.1.0',
          instruction: 'Use the demo agent directly.',
        },
        spec: {
          agent: { path: './agent.md' },
        },
      },
    });

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});

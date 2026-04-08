import { describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { makeInjectCommand } from './inject.js';

vi.mock('@spwnr/injector', () => ({
  injectStatic: vi.fn().mockResolvedValue({
    packageName: 'code-reviewer',
    version: '0.1.0',
    host: 'claude_code',
    targetDir: '/tmp/target',
    installedDir: '/tmp/pkg',
    files: [{ path: '/tmp/target/code-reviewer.md', content: '# Test' }],
  }),
}));

describe('inject command', () => {
  it('calls injectStatic with host and scope', async () => {
    const { injectStatic } = await import('@spwnr/injector');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const program = new Command();
    program.addCommand(makeInjectCommand());
    await program.parseAsync([
      'node',
      'spwnr',
      'inject',
      'code-reviewer',
      '--host',
      'claude_code',
      '--scope',
      'user',
      '--target',
      '/tmp/target',
    ]);

    expect(injectStatic).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'code-reviewer',
        host: 'claude_code',
        scope: 'user',
        targetDir: '/tmp/target',
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Injected code-reviewer@0.1.0'));
  });
});

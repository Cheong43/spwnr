import { describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { makeSessionCommand } from './session.js';

vi.mock('@spwnr/injector', () => ({
  composeSession: vi.fn().mockResolvedValue({
    packageName: 'code-reviewer',
    version: '0.1.0',
    installedDir: '/tmp/pkg',
    host: 'codex',
    format: 'shell',
    content: "printf 'preview-only'",
    descriptor: { preview: true },
    previewOnly: true,
    warnings: ['preview-only'],
  }),
}));

describe('session command', () => {
  it('prints session content and warnings', async () => {
    const { composeSession } = await import('@spwnr/injector');
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const program = new Command();
    program.addCommand(makeSessionCommand());
    await program.parseAsync(['node', 'spwnr', 'session', 'code-reviewer', '--host', 'codex', '--format', 'shell']);

    expect(composeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        packageName: 'code-reviewer',
        host: 'codex',
        format: 'shell',
      }),
    );
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('preview-only'));
    expect(stdoutSpy).toHaveBeenCalledWith("printf 'preview-only'");
  });
});

import { describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { makeRunCommand } from './run.js';

describe('run command', () => {
  it('is hidden from help and exits with a deprecation message', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    const program = new Command();
    program.addCommand(makeRunCommand());
    await program.parseAsync(['node', 'spwnr', 'run', 'code-reviewer']);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

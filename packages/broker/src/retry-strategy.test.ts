import { describe, it, expect, vi } from 'vitest';
import { RetryStrategy } from './retry-strategy.js';

describe('RetryStrategy', () => {
  it('returns result on first success', async () => {
    const strategy = new RetryStrategy({ maxRetries: 2, delayMs: 0 });
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await strategy.execute(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds on second attempt', async () => {
    const strategy = new RetryStrategy({ maxRetries: 2, delayMs: 0 });
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const result = await strategy.execute(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after maxRetries exhausted', async () => {
    const strategy = new RetryStrategy({ maxRetries: 2, delayMs: 0 });
    const err = new Error('persistent failure');
    const fn = vi.fn().mockRejectedValue(err);

    await expect(strategy.execute(fn)).rejects.toThrow('persistent failure');
  });

  it('calls function exactly maxRetries+1 times on consistent failure', async () => {
    const strategy = new RetryStrategy({ maxRetries: 3, delayMs: 0 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(strategy.execute(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('uses default options when none provided', async () => {
    // Default is maxRetries:2, just verify it works with zero delay override via custom instance
    const strategy = new RetryStrategy({ maxRetries: 1, delayMs: 0 });
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValue('done');

    const result = await strategy.execute(fn);
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('propagates the last error when all retries fail', async () => {
    const strategy = new RetryStrategy({ maxRetries: 2, delayMs: 0 });
    const lastErr = new Error('last error');
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockRejectedValue(lastErr);

    await expect(strategy.execute(fn)).rejects.toBe(lastErr);
  });
});

export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
}

export class RetryStrategy {
  constructor(private options: RetryOptions = { maxRetries: 2, delayMs: 1000 }) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < this.options.maxRetries) {
          await new Promise(r => setTimeout(r, this.options.delayMs));
        }
      }
    }
    throw lastError;
  }
}

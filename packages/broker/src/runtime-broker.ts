import { ErrorCodes, SpwnrError } from '@spwnr/core-types';
import type { BrokerRunOptions, RunResult } from './types.js';

/**
 * @deprecated Spwnr no longer orchestrates host runtimes directly.
 * This class remains only so older internal experiments still compile.
 */
export class RuntimeBroker {
  constructor(..._deps: unknown[]) {}

  async run(_options: BrokerRunOptions): Promise<RunResult> {
    throw new SpwnrError(
      ErrorCodes.INTERNAL_ERROR,
      'RuntimeBroker is deprecated. Use Spwnr injection flows instead.',
    );
  }
}

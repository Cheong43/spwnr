import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'tests/vitest.config.ts',
  'packages/core-types/vitest.config.ts',
  'packages/manifest-schema/vitest.config.ts',
  'packages/registry/vitest.config.ts',
  'packages/policy/vitest.config.ts',
  'packages/adapters/vitest.config.ts',
  'packages/injector/vitest.config.ts',
  'apps/*/vitest.config.ts',
]);

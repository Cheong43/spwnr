import { describe, expect, it } from 'vitest';
import { mapPolicyPlaceholder } from './mappers.js';

describe('mapPolicyPlaceholder', () => {
  it('returns null because policy mapping is intentionally disabled', () => {
    expect(mapPolicyPlaceholder()).toBeNull();
  });
});

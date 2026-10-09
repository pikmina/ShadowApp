import { describe, it, expect } from 'vitest';
import { getPublicCharacterByIdOrName } from '../characters.ts';

// Test the matching heuristics and normalization logic
describe('Public Character Lookup Matching', () => {
  it('handles null or empty identifier gracefully', async () => {
    expect(await getPublicCharacterByIdOrName('')).toBeNull();
    expect(await getPublicCharacterByIdOrName('   ')).toBeNull();
    expect(await getPublicCharacterByIdOrName('\\')).toBeNull();
  });
});

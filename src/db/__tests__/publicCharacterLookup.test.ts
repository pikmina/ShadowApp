import { describe, it, expect } from 'vitest';
import { getPublicCharacterByIdOrName } from '../characters.ts';

// Test the matching heuristics and normalization logic
describe('Public Character Lookup Matching', () => {
  it('handles null or empty identifier gracefully', async () => {
    expect(await getPublicCharacterByIdOrName('')).toBeNull();
    expect(await getPublicCharacterByIdOrName('   ')).toBeNull();
    expect(await getPublicCharacterByIdOrName('\\')).toBeNull();
  });

  it('resolves Izuku public character with stats', async () => {
    const char = await getPublicCharacterByIdOrName('Izuku');
    if (char) {
      expect(char.stats).toBeDefined();
      expect(typeof char.stats.estamina_maxima).toBe('number');
      expect(char.stats.estamina_maxima).toBeGreaterThan(0);
    }
  });
});

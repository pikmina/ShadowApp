import { describe, it, expect } from 'vitest';
import {
  generatePlayerName,
  generatePlayerNameList,
  COMIC_PREFIXES,
  CUTE_ANIMALS,
  HEROIC_SUFFIXES,
  CURATED_HEROIC_ALIASES
} from '../../lib/playerNameGenerator.ts';

describe('Player Name Generator Tests', () => {
  it('generates valid player names across all categories', () => {
    const categories = ['all', 'comic', 'heroic', 'cute_animals'] as const;

    for (const cat of categories) {
      const name = generatePlayerName(cat);
      expect(typeof name).toBe('string');
      expect(name.trim().length).toBeGreaterThan(2);
    }
  });

  it('generates a distinct list of suggested player names', () => {
    const list = generatePlayerNameList(5, 'all');
    expect(list.length).toBe(5);
    const unique = new Set(list);
    expect(unique.size).toBe(5);
  });

  it('contains cute animals, comic prefixes, and heroic suffixes in word pools', () => {
    expect(CUTE_ANIMALS).toContain('Ajolote');
    expect(CUTE_ANIMALS).toContain('Nutria');
    expect(CUTE_ANIMALS).toContain('Capibara');
    expect(CUTE_ANIMALS).toContain('Gatito');
    expect(CUTE_ANIMALS).toContain('Mapache');

    expect(COMIC_PREFIXES).toContain('Capitán');
    expect(COMIC_PREFIXES).toContain('Super');
    expect(COMIC_PREFIXES).toContain('Bat');
    expect(COMIC_PREFIXES).toContain('Spider');

    expect(HEROIC_SUFFIXES).toContain('Justiciero');
    expect(HEROIC_SUFFIXES).toContain('del Trueno');
    expect(HEROIC_SUFFIXES).toContain('Atómico');
  });

  it('includes curated heroic aliases', () => {
    expect(CURATED_HEROIC_ALIASES).toContain('Ajolote Sónico');
    expect(CURATED_HEROIC_ALIASES).toContain('Nutria Vengadora');
    expect(CURATED_HEROIC_ALIASES).toContain('Capibara Supremo');
  });
});

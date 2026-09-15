import { afterAll, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../index.ts';
import { canonCharacters } from '../schema.ts';
import { createCanonCharacter, getCanonCharacters, updateCanonCharacter } from '../canonCharacters.ts';

let dbAvailable = false;
let canonId = '';

try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch {
  console.warn('DB not available for integration test.');
}

describe.skipIf(!dbAvailable)('Canon Character Details Integration', () => {
  afterAll(async () => {
    if (canonId) await db.delete(canonCharacters).where(eq(canonCharacters.id, canonId));
  });

  test('1. creates a canon with descriptive fields', async () => {
    const suffix = nanoid(8);
    const created = await createCanonCharacter({
      name: `Canon Details ${suffix}`,
      firstName: 'Toshinori',
      lastName: 'Yagi',
      aliases: ['All Might', 'Símbolo de la Paz'],
      summary: 'Héroe profesional retirado.',
      imageUrl: 'https://example.com/all-might.png',
      affiliation: 'Héroes profesionales',
    });
    canonId = created.id;

    expect(created).toMatchObject({
      firstName: 'Toshinori',
      lastName: 'Yagi',
      aliases: ['All Might', 'Símbolo de la Paz'],
      summary: 'Héroe profesional retirado.',
      imageUrl: 'https://example.com/all-might.png',
      affiliation: 'Héroes profesionales',
    });
  });

  test('2. reloads all persisted descriptive fields', async () => {
    const canons = await getCanonCharacters();
    const canon = canons.find((entry) => entry.id === canonId);

    expect(canon).toMatchObject({
      aliases: ['All Might', 'Símbolo de la Paz'],
      summary: 'Héroe profesional retirado.',
      imageUrl: 'https://example.com/all-might.png',
      affiliation: 'Héroes profesionales',
      status: 'available',
    });
  });

  test('3. updates one field without overwriting the others', async () => {
    const updated = await updateCanonCharacter(canonId, { affiliation: 'U.A. High School' });

    expect(updated.affiliation).toBe('U.A. High School');
    expect(updated.aliases).toEqual(['All Might', 'Símbolo de la Paz']);
    expect(updated.summary).toBe('Héroe profesional retirado.');
    expect(updated.imageUrl).toBe('https://example.com/all-might.png');
  });

  test('4. preserves explicit empty aliases', async () => {
    const updated = await updateCanonCharacter(canonId, { aliases: [] });
    expect(updated.aliases).toEqual([]);

    const [stored] = await db.select().from(canonCharacters).where(eq(canonCharacters.id, canonId));
    expect(stored.aliases).toEqual([]);
    expect(stored.summary).toBe('Héroe profesional retirado.');
  });
});

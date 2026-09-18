import { describe, expect, test } from 'vitest';
import { db } from '../index.ts';
import { deleteSheetField, getSheetFields, seedCoreProfileFields } from '../sheetFields.ts';
import { coreProfileFields, profileValue } from '../../domain/coreProfileFields.ts';

let dbAvailable = false;
try { await db.execute('SELECT 1'); dbAvailable = true; } catch { /* PostgreSQL tests are optional for the unit runner. */ }

describe.skipIf(!dbAvailable)('Protected profile fields', () => {
  test('seeds each definition once and refuses deletion', async () => {
    await seedCoreProfileFields();
    await seedCoreProfileFields();
    const fields = await getSheetFields();
    for (const definition of coreProfileFields) {
      const matching = fields.filter(field => field.coreKey === definition.key);
      expect(matching).toHaveLength(1);
      await expect(deleteSheetField(matching[0].id)).rejects.toMatchObject({ status: 409 });
    }
    const quirkLevelField = fields.find(field => field.coreKey === 'quirk_level');
    expect(quirkLevelField).toBeDefined();
    expect(quirkLevelField?.category).toBe('Quirk & Poder');
    expect(quirkLevelField?.options).toEqual([
      'Nivel 1. Despertar',
      'Nivel 2. Dominio',
      'Nivel 3. Trascendencia'
    ]);
  });
});

test('reads existing semantic values without replacing intentional blanks', () => {
  expect(profileValue({ faceclaim: '', pb: 'Older faceclaim' }, 'faceclaim')).toBe('');
  expect(profileValue({ avatarUrl: 'https://example.com/avatar.png' }, 'avatar_url')).toBe('https://example.com/avatar.png');
  expect(profileValue({ quirk_evolution: 'Nivel 2. Dominio' }, 'quirk_level')).toBe('Nivel 2. Dominio');
  expect(profileValue({ quirk_level: 'Nivel 3. Trascendencia' }, 'quirk_level')).toBe('Nivel 3. Trascendencia');
});

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
  });
});

test('reads existing semantic values without replacing intentional blanks', () => {
  expect(profileValue({ faceclaim: '', pb: 'Older faceclaim' }, 'faceclaim')).toBe('');
  expect(profileValue({ avatarUrl: 'https://example.com/avatar.png' }, 'avatar_url')).toBe('https://example.com/avatar.png');
});

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../index.ts';
import { systemRules } from '../schema.ts';
import { getRule, seedCoreRules, upsertRule } from '../rules.ts';
import { defaultEmploymentCompensation, employmentCompensationSchema } from '../../domain/employmentCompensation.ts';

let dbAvailable = false;
let original: typeof systemRules.$inferSelect | undefined;

try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch {
  console.warn('DB not available for integration test.');
}

describe.skipIf(!dbAvailable)('Employment compensation rule persistence', () => {
  beforeAll(async () => {
    original = await getRule('employment_compensation');
  });

  afterAll(async () => {
    if (original) {
      await db.insert(systemRules).values(original).onConflictDoUpdate({
        target: systemRules.key,
        set: { type: original.type, value: original.value, description: original.description, updatedAt: original.updatedAt },
      });
    } else {
      await db.delete(systemRules).where(eq(systemRules.key, 'employment_compensation'));
    }
  });

  test('startup creates a valid rule when missing', async () => {
    await db.delete(systemRules).where(eq(systemRules.key, 'employment_compensation'));
    await seedCoreRules();
    expect(employmentCompensationSchema.parse((await getRule('employment_compensation'))?.value)).toEqual(defaultEmploymentCompensation);
  });

  test('startup preserves an existing customized rule', async () => {
    const customized = { ...defaultEmploymentCompensation, levels: defaultEmploymentCompensation.levels.map((entry, index) => index === 0 ? { ...entry, yen: 777 } : entry) };
    await upsertRule('employment_compensation', 'json', customized, 'Test compensation');
    await seedCoreRules();
    expect(employmentCompensationSchema.parse((await getRule('employment_compensation'))?.value).levels[0].yen).toBe(777);
  });

  test('persistence rejects invalid compensation documents', async () => {
    await expect(upsertRule('employment_compensation', 'json', { ...defaultEmploymentCompensation, manualApprovalRequired: false }, 'Invalid')).rejects.toThrow();
  });
});

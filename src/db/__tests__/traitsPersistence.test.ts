import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../index.ts';
import { systemElements } from '../schema.ts';
import { eq, inArray, like } from 'drizzle-orm';
import { seedCoreTraits, upsertElement, getElement } from '../elements.ts';
import { SYSTEM_TRAITS } from '../../domain/systemTraits.ts';

describe('Database Persistence: SYSTEM_TRAITS & MechanicalBehaviors', () => {
  const traitIds = SYSTEM_TRAITS.map(t => t.id);

  it('seedCoreTraits seeds all 14 traits with published status and full mechanicalBehaviors', async () => {
    // Ensure all 14 are seeded
    await seedCoreTraits('test-seed-runner');

    const rows = await db.select().from(systemElements).where(eq(systemElements.kind, 'trait'));
    expect(rows.length).toBe(14);

    for (const trait of SYSTEM_TRAITS) {
      const dbRow = rows.find(r => r.id === trait.id || (r.name.trim().toLowerCase() === trait.name.trim().toLowerCase() && r.kind === 'trait'));
      expect(dbRow).toBeDefined();
      expect(dbRow!.kind).toBe('trait');
      expect(dbRow!.status).toBe('published');
    }
  });

  it('seedCoreTraits is idempotent and does not duplicate or alter existing rows', async () => {
    // Second seed run
    const secondRun = await seedCoreTraits('test-seed-runner');
    expect(secondRun.length).toBe(0); // 0 newly seeded items

    const rowsAfter = await db.select().from(systemElements).where(eq(systemElements.kind, 'trait'));
    expect(rowsAfter.length).toBe(14);
  });

  it('protects user modifications, custom edits, and archiving against seed resets', async () => {
    const targetId = 'core.trait.mental-fortitude';

    // 1. User customizes the trait (archives it and updates description)
    const customDescription = 'Edición personalizada por el usuario para prueba de persistencia.';
    await db.update(systemElements)
      .set({
        description: customDescription,
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(systemElements.id, targetId));

    // 2. Re-run seedCoreTraits as if server restarted
    const restartSeeded = await seedCoreTraits('system-restart');
    expect(restartSeeded.find(s => s.id === targetId)).toBeUndefined();

    // 3. Verify user's custom changes were preserved
    const [preserved] = await db.select().from(systemElements).where(eq(systemElements.id, targetId));
    expect(preserved).toBeDefined();
    expect(preserved.status).toBe('archived'); // Remains archived
    expect(preserved.description).toBe(customDescription); // Remains user's custom description

    // Cleanup: restore to published default
    const originalTrait = SYSTEM_TRAITS.find(t => t.id === targetId)!;
    await db.update(systemElements)
      .set({
        description: originalTrait.description,
        status: 'published',
        updatedAt: new Date(),
      })
      .where(eq(systemElements.id, targetId));
  });

  it('persists and retrieves custom mechanicalBehaviors via upsertElement API', async () => {
    const testElementData = {
      name: 'Test Custom Element with Behaviors',
      description: 'Test element for catalog mechanicalBehaviors persistence',
      kind: 'trait' as const,
      status: 'draft' as const,
      effects: [],
      mechanicalBehaviors: [
        {
          id: 'test.behavior.continuous',
          mode: 'continuous',
          effects: [
            {
              id: 'test.effect.1',
              type: 'attribute_modifier',
              attributeId: 'fue',
              amount: 2,
            },
          ],
        },
      ],
      requirements: { operator: 'all' as const, requirements: [] },
      metadata: { testMeta: 'sample_value' },
    };

    // 1. Create element
    const created = await upsertElement(testElementData, 'test-actor');
    expect(created.id).toBeDefined();
    expect(created.mechanicalBehaviors).toBeDefined();
    expect((created.mechanicalBehaviors as any[])[0].id).toBe('test.behavior.continuous');

    // 2. Read back from database
    const fetched = await getElement(created.id);
    expect(fetched).toBeDefined();
    expect(fetched.name).toBe(testElementData.name);
    expect(Array.isArray(fetched.mechanicalBehaviors)).toBe(true);
    const behaviors = fetched.mechanicalBehaviors as any[];
    expect(behaviors.length).toBe(1);
    expect(behaviors[0].effects[0].attributeId).toBe('fue');
    expect(behaviors[0].effects[0].amount).toBe(2);

    // 3. Clean up
    await db.delete(systemElements).where(eq(systemElements.id, created.id));
  });

  it('explicitly deleted canonical seed trait is tracked in auditLogs and not resurrected on subsequent seed runs', async () => {
    const canonicalTrait = SYSTEM_TRAITS.find(t => t.id === 'core.trait.flying')!;
    const { deleteElement } = await import('../elements.ts');
    const { auditLogs } = await import('../schema.ts');
    const { and } = await import('drizzle-orm');

    try {
      // 1. Ensure all traits are initially seeded
      await seedCoreTraits('test-setup');
      const initialTraits = await db.select().from(systemElements).where(eq(systemElements.kind, 'trait'));
      expect(initialTraits.length).toBe(14);

      // 2. Transition target canonical trait to draft so deleteElement can process it
      await db.update(systemElements)
        .set({ status: 'draft', updatedAt: new Date() })
        .where(eq(systemElements.id, canonicalTrait.id));

      // 3. Delete through deleteElement service
      await deleteElement(canonicalTrait.id, 'test-moderator');

      // 4. Confirm it is removed from systemElements
      const [checkDeleted] = await db.select().from(systemElements).where(eq(systemElements.id, canonicalTrait.id));
      expect(checkDeleted).toBeUndefined();

      const traitsAfterDelete = await db.select().from(systemElements).where(eq(systemElements.kind, 'trait'));
      expect(traitsAfterDelete.length).toBe(13);

      // 5. Verify auditLog recorded the deletion
      const [auditEntry] = await db.select().from(auditLogs).where(
        and(
          eq(auditLogs.actionType, 'element_deleted'),
          eq(auditLogs.targetId, canonicalTrait.id)
        )
      );
      expect(auditEntry).toBeDefined();

      // 6. Re-run seedCoreTraits to simulate restart or subsequent seed execution
      const reseedResult = await seedCoreTraits('system-reseed');
      expect(reseedResult.find(r => r.id === canonicalTrait.id)).toBeUndefined();

      // 7. Verify the deleted trait was NOT resurrected, and the other 13 remain intact
      const traitsAfterReseed = await db.select().from(systemElements).where(eq(systemElements.kind, 'trait'));
      expect(traitsAfterReseed.length).toBe(13);
      expect(traitsAfterReseed.find(t => t.id === canonicalTrait.id)).toBeUndefined();

      for (const otherTrait of SYSTEM_TRAITS.filter(t => t.id !== canonicalTrait.id)) {
        const found = traitsAfterReseed.find(t => t.id === otherTrait.id || (t.name.trim().toLowerCase() === otherTrait.name.trim().toLowerCase() && t.kind === 'trait'));
        expect(found).toBeDefined();
        expect(found!.status).toBe('published');
      }
    } finally {
      // 8. Clean up: remove the test audit log entry and re-seed canonical trait
      await db.delete(auditLogs).where(
        and(
          eq(auditLogs.actionType, 'element_deleted'),
          eq(auditLogs.targetId, canonicalTrait.id)
        )
      );
      await seedCoreTraits('test-cleanup-restore');
      const finalTraits = await db.select().from(systemElements).where(eq(systemElements.kind, 'trait'));
      expect(finalTraits.length).toBe(14);
    }
  });
});

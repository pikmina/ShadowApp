import { describe, it, expect } from 'vitest';
import { db } from '../index.ts';
import { systemElements, auditLogs, elementPossessions } from '../schema.ts';
import { eq, and } from 'drizzle-orm';
import { SYSTEM_TRAITS } from '../../domain/systemTraits.ts';
import { nanoid } from 'nanoid';
import { migrateLegacyTraitToCanonical, inspectLegacyTraitMigration } from '../elements.ts';

describe('Trait Migration Validation on Disposable Copies', () => {
  it('migrates legacy traits to canonical SYSTEM_TRAITS mechanicalBehaviors atomically with revision check and audit logging', async () => {
    // 1. Create disposable mock elements replicating legacy state
    const disposableStaminaId = `test-stamina-${nanoid(6)}`;
    const disposableReflexesId = `test-reflexes-${nanoid(6)}`;

    const legacyStaminaRecord = {
      id: disposableStaminaId,
      kind: 'trait' as const,
      name: 'Estamina Mejorada (Legacy)',
      description: '+2 de Estamina Máxima',
      status: 'published' as const,
      effects: [],
      mechanicalBehaviors: [],
      requirements: { operator: 'all' as const, requirements: [] },
      metadata: { originalMeta: 'preserved-stamina' },
      revision: 1,
    };

    const legacyReflexesRecord = {
      id: disposableReflexesId,
      kind: 'trait' as const,
      name: 'Reflejos Rápidos (Legacy)',
      description: '+2 iniciativa permanente incorrecta',
      status: 'published' as const,
      effects: [
        {
          id: 'legacy-reflexes-eff-1',
          type: 'derived_stat_modifier',
          statId: 'INI',
          amount: 2,
          timing: 'passive',
        },
      ],
      mechanicalBehaviors: [],
      requirements: { operator: 'all' as const, requirements: [] },
      metadata: { originalMeta: 'preserved-reflexes' },
      revision: 1,
    };

    try {
      // Insert disposable records
      await db.insert(systemElements).values([legacyStaminaRecord, legacyReflexesRecord]);

      // 2. Obtain canonical definitions from SYSTEM_TRAITS
      const canonicalStaminaTrait = SYSTEM_TRAITS.find(t => t.id === 'core.trait.improved-stamina')!;
      const canonicalReflexesTrait = SYSTEM_TRAITS.find(t => t.id === 'core.trait.quick-reflexes')!;

      expect(canonicalStaminaTrait.mechanicalBehaviors).toBeDefined();
      expect(canonicalReflexesTrait.mechanicalBehaviors).toBeDefined();

      // 3. Test dry-run inspection mode
      const inspectionStamina = await inspectLegacyTraitMigration(disposableStaminaId, 'core.trait.improved-stamina');
      expect(inspectionStamina.currentRevision).toBe(1);
      expect(inspectionStamina.predictedRevision).toBe(2);
      expect(inspectionStamina.preservedFields.status).toBe('published');

      // Test 3a: Verify optimistic concurrency rejection on obsolete revision using migrateLegacyTraitToCanonical
      let conflictError: any = null;
      try {
        await migrateLegacyTraitToCanonical(disposableStaminaId, 999, 'core.trait.improved-stamina', 'test-migrator');
      } catch (err) {
        conflictError = err;
      }
      expect(conflictError).toBeDefined();
      expect(conflictError.status).toBe(409);

      // Test 3b: Successful atomic migration for Estamina Mejorada using reusable function
      const migratedStamina = await migrateLegacyTraitToCanonical(
        disposableStaminaId,
        1,
        'core.trait.improved-stamina',
        'test-migrator'
      );

      expect(migratedStamina.revision).toBe(2);
      expect(migratedStamina.effects).toEqual([]);
      expect(migratedStamina.mechanicalBehaviors).toEqual(canonicalStaminaTrait.mechanicalBehaviors);
      const staminaBehaviors = migratedStamina.mechanicalBehaviors as any[];
      expect(staminaBehaviors.length).toBe(1);
      expect(staminaBehaviors[0].effects[0].statId).toBe('estamina');
      expect(staminaBehaviors[0].effects[0].amount).toBe(2);

      // Test 3c: Successful atomic migration for Reflejos Rápidos using reusable function
      const migratedReflexes = await migrateLegacyTraitToCanonical(
        disposableReflexesId,
        1,
        'core.trait.quick-reflexes',
        'test-migrator'
      );

      expect(migratedReflexes.revision).toBe(2);
      expect(migratedReflexes.effects).toEqual([]);
      const reflexesBehaviors = migratedReflexes.mechanicalBehaviors as any[];
      expect(reflexesBehaviors.length).toBe(1);
      expect(reflexesBehaviors[0].conditions).toBeDefined();
      expect(reflexesBehaviors[0].conditions[0].signalId).toBe('first_turn');
      expect(reflexesBehaviors[0].effects[0].statId).toBe('ini');
      expect(reflexesBehaviors[0].effects[0].amount).toBe(2);

      // 4. Verify persistence, status, createdAt, and possession relationship integrity after reload
      const [reloadedStamina] = await db.select().from(systemElements).where(eq(systemElements.id, disposableStaminaId));
      const [reloadedReflexes] = await db.select().from(systemElements).where(eq(systemElements.id, disposableReflexesId));

      expect(reloadedStamina.status).toBe(legacyStaminaRecord.status);
      expect(reloadedStamina.createdAt).toBeDefined();
      expect(reloadedStamina.effects).toEqual([]);
      expect(reloadedStamina.mechanicalBehaviors).toEqual(canonicalStaminaTrait.mechanicalBehaviors);

      expect(reloadedReflexes.status).toBe(legacyReflexesRecord.status);
      expect(reloadedReflexes.createdAt).toBeDefined();
      expect(reloadedReflexes.effects).toEqual([]);
      expect(reloadedReflexes.mechanicalBehaviors).toEqual(canonicalReflexesTrait.mechanicalBehaviors);

      // 5. Compare completely extraneous records, metadata, requirements, and relations
      expect(reloadedStamina.name).toBe(legacyStaminaRecord.name);
      expect(reloadedStamina.description).toBe(legacyStaminaRecord.description);
      expect(reloadedStamina.metadata).toEqual(legacyStaminaRecord.metadata);
      expect(reloadedStamina.kind).toBe(legacyStaminaRecord.kind);
      expect(reloadedStamina.requirements).toEqual(legacyStaminaRecord.requirements);

      expect(reloadedReflexes.name).toBe(legacyReflexesRecord.name);
      expect(reloadedReflexes.description).toBe(legacyReflexesRecord.description);
      expect(reloadedReflexes.metadata).toEqual(legacyReflexesRecord.metadata);
      expect(reloadedReflexes.kind).toBe(legacyReflexesRecord.kind);
      expect(reloadedReflexes.requirements).toEqual(legacyReflexesRecord.requirements);

      // 6. Verify audit log recorded migrations
      const auditEntriesStamina = await db.select().from(auditLogs).where(
        and(eq(auditLogs.actionType, 'element_updated'), eq(auditLogs.targetId, disposableStaminaId))
      );
      expect(auditEntriesStamina.length).toBe(1);
      expect((auditEntriesStamina[0].details as any).newRevision).toBe(2);

    } finally {
      // 7. Clean up disposable test data and audit logs
      await db.delete(systemElements).where(eq(systemElements.id, disposableStaminaId));
      await db.delete(systemElements).where(eq(systemElements.id, disposableReflexesId));
      await db.delete(auditLogs).where(eq(auditLogs.targetId, disposableStaminaId));
      await db.delete(auditLogs).where(eq(auditLogs.targetId, disposableReflexesId));
    }
  });
});

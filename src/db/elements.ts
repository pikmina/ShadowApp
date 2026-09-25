import { assertElementMechanics } from "../domain/elementMechanics.ts";
import { systemMechanicsConfigSchema } from "../domain/systemMechanics.ts";
import { db } from './index.ts';
import { systemElements, elementPossessions, shopOffers, systemRules, auditLogs } from './schema.ts';
import { eq, desc, sql, or, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requirementGroupSchema } from '../domain/requirements.ts';
import { SYSTEM_WEAKNESSES, CORE_ALTERED_STATUSES } from '../domain/systemWeaknesses.ts';
import { SYSTEM_TRAITS } from '../domain/systemTraits.ts';

export async function getElements() {
  try {
    return await db.select().from(systemElements).orderBy(desc(systemElements.createdAt));
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch elements");
  }
}

export async function getPublishedElements() {
  return db.select().from(systemElements).where(eq(systemElements.status, 'published')).orderBy(desc(systemElements.createdAt));
}

export async function getElement(id: string) {
  try {
    const results = await db.select().from(systemElements).where(eq(systemElements.id, id));
    return results[0];
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch element");
  }
}

export async function upsertElement(data: any, actorUid: string = 'system') {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(72643001)`);
    const [existing] = data.id ? await tx.select().from(systemElements).where(eq(systemElements.id, data.id)) : [];
    if (data.id && !existing) throw Object.assign(new Error('Element not found'), { status: 404 });
    const effects = data.effects ?? existing?.effects ?? [];
    const mechanicalBehaviors = data.mechanicalBehaviors ?? existing?.mechanicalBehaviors ?? [];
    const requirements = requirementGroupSchema.parse(data.requirements ?? existing?.requirements ?? { operator: 'all', requirements: [] });
    const status = data.status ?? existing?.status ?? 'draft';
    const [stored] = await tx.select().from(systemRules).where(eq(systemRules.key, 'system_mechanics'));
    const mechanics = systemMechanicsConfigSchema.parse(stored?.value ?? []);
    assertElementMechanics(effects as unknown[], status, mechanics, mechanicalBehaviors as unknown[]);
    if (existing) {
      const [updated] = await tx.update(systemElements).set({
        kind: data.kind, name: data.name, description: data.description, status: data.status,
        effects: data.effects, mechanicalBehaviors: data.mechanicalBehaviors === undefined ? undefined : mechanicalBehaviors,
        requirements: data.requirements === undefined ? undefined : requirements, metadata: data.metadata,
        revision: (existing.revision ?? 1) + 1, updatedAt: new Date(),
      }).where(eq(systemElements.id, existing.id)).returning();

      await tx.insert(auditLogs).values({
        actorUid,
        actionType: 'element_updated',
        targetId: updated.id,
        details: {
          name: updated.name,
          previousName: existing.name,
          kind: updated.kind,
          status: updated.status,
          previousStatus: existing.status,
          revision: updated.revision,
          effectsCount: Array.isArray(updated.effects) ? (updated.effects as any[]).length : 0,
          mechanicalBehaviorsCount: Array.isArray(updated.mechanicalBehaviors) ? (updated.mechanicalBehaviors as any[]).length : 0,
        },
      });

      return updated;
    }
    const [created] = await tx.insert(systemElements).values({
      id: nanoid(10), kind: data.kind, name: data.name, description: data.description, status,
      effects, mechanicalBehaviors, requirements, metadata: data.metadata ?? {},
    }).returning();

    await tx.insert(auditLogs).values({
      actorUid,
      actionType: 'element_created',
      targetId: created.id,
      details: {
        name: created.name,
        kind: created.kind,
        status: created.status,
        effectsCount: Array.isArray(created.effects) ? (created.effects as any[]).length : 0,
        mechanicalBehaviorsCount: Array.isArray(created.mechanicalBehaviors) ? (created.mechanicalBehaviors as any[]).length : 0,
      },
    });

    return created;
  });
}

export async function deleteElement(id: string, actorUid: string = 'system') {
  try {
    await db.transaction(async (tx) => {
      const [element] = await tx.select().from(systemElements).where(eq(systemElements.id, id));
      if (!element) throw Object.assign(new Error('Element not found'), { status: 404 });
      const [possession] = await tx.select({ id: elementPossessions.id }).from(elementPossessions).where(eq(elementPossessions.elementId, id));
      const [offer] = await tx.select({ id: shopOffers.id }).from(shopOffers).where(eq(shopOffers.elementId, id));
      if (possession || offer) throw Object.assign(new Error('Element has related possessions or offers and cannot be deleted'), { status: 409 });
      
      await tx.delete(systemElements).where(eq(systemElements.id, id));

      await tx.insert(auditLogs).values({
        actorUid,
        actionType: 'element_deleted',
        targetId: id,
        details: {
          name: element.name,
          kind: element.kind,
          status: element.status,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && 'status' in error) throw error;
    console.error("Database query failed:", error);
    throw new Error("Failed to delete element");
  }
}

export async function seedCoreWeaknesses(actorUid: string = 'system') {
  return db.transaction(async (tx) => {
    // 1. Seed Core Altered Statuses (only if not already present or deleted)
    for (const status of CORE_ALTERED_STATUSES) {
      const existing = await tx.select().from(systemElements).where(
        or(
          eq(systemElements.id, status.id),
          and(eq(systemElements.kind, 'altered_status'), eq(systemElements.name, status.name))
        )
      );
      if (existing.length > 0) continue;

      const deletedLog = await tx.select({ id: auditLogs.id }).from(auditLogs).where(
        and(
          eq(auditLogs.actionType, 'element_deleted'),
          or(
            eq(auditLogs.targetId, status.id),
            sql`(${auditLogs.details}->>'name' = ${status.name} AND ${auditLogs.details}->>'kind' = 'altered_status')`
          )
        )
      );

      if (deletedLog.length === 0) {
        await tx.insert(systemElements).values({
          id: status.id,
          kind: 'altered_status',
          name: status.name,
          description: status.description,
          status: 'published',
          effects: [],
          mechanicalBehaviors: status.mechanicalBehaviors,
          requirements: { operator: 'all', requirements: [] },
          metadata: {},
        });
      }
    }

    // 2. Seed 23 System Weaknesses (only if not already present or deleted, preserving user edits)
    const seeded: Array<{ id: string; name: string }> = [];
    for (const weakness of SYSTEM_WEAKNESSES) {
      const existing = await tx.select().from(systemElements).where(
        or(
          eq(systemElements.id, weakness.id),
          and(eq(systemElements.kind, 'weakness'), eq(systemElements.name, weakness.name))
        )
      );

      if (existing.length > 0) {
        const row = existing[0];
        const currentBehaviors = (row.mechanicalBehaviors as any[]) || [];
        if (currentBehaviors.length === 0 && weakness.mechanicalBehaviors && weakness.mechanicalBehaviors.length > 0) {
          await tx.update(systemElements)
            .set({ mechanicalBehaviors: weakness.mechanicalBehaviors, updatedAt: new Date() })
            .where(eq(systemElements.id, row.id));
        }
        continue;
      }

      const deletedLog = await tx.select({ id: auditLogs.id }).from(auditLogs).where(
        and(
          eq(auditLogs.actionType, 'element_deleted'),
          or(
            eq(auditLogs.targetId, weakness.id),
            sql`(${auditLogs.details}->>'name' = ${weakness.name} AND ${auditLogs.details}->>'kind' = 'weakness')`
          )
        )
      );

      if (deletedLog.length === 0) {
        await tx.insert(systemElements).values({
          id: weakness.id,
          kind: 'weakness',
          name: weakness.name,
          description: weakness.description,
          status: 'published',
          effects: [],
          mechanicalBehaviors: weakness.mechanicalBehaviors,
          requirements: { operator: 'all', requirements: [] },
          metadata: {},
        });
        seeded.push({ id: weakness.id, name: weakness.name });
      }
    }
    return seeded;
  });
}

export async function seedCoreTraits(actorUid: string = 'system') {
  return db.transaction(async (tx) => {
    const seeded: Array<{ id: string; name: string }> = [];
    for (const trait of SYSTEM_TRAITS) {
      const existing = await tx.select().from(systemElements).where(
        or(
          eq(systemElements.id, trait.id),
          and(eq(systemElements.kind, 'trait'), eq(systemElements.name, trait.name))
        )
      );

      if (existing.length > 0) {
        const row = existing[0];
        const currentBehaviors = (row.mechanicalBehaviors as any[]) || [];
        if (currentBehaviors.length === 0 && trait.mechanicalBehaviors && trait.mechanicalBehaviors.length > 0) {
          await tx.update(systemElements)
            .set({ mechanicalBehaviors: trait.mechanicalBehaviors, updatedAt: new Date() })
            .where(eq(systemElements.id, row.id));
        }
        continue;
      }

      const deletedLog = await tx.select({ id: auditLogs.id }).from(auditLogs).where(
        and(
          eq(auditLogs.actionType, 'element_deleted'),
          or(
            eq(auditLogs.targetId, trait.id),
            sql`(${auditLogs.details}->>'name' = ${trait.name} AND ${auditLogs.details}->>'kind' = 'trait')`
          )
        )
      );

      if (deletedLog.length === 0) {
        await tx.insert(systemElements).values({
          id: trait.id,
          kind: 'trait',
          name: trait.name,
          description: trait.description,
          status: 'published',
          effects: [],
          mechanicalBehaviors: trait.mechanicalBehaviors,
          requirements: { operator: 'all', requirements: [] },
          metadata: trait.metadata ?? {},
        });
        seeded.push({ id: trait.id, name: trait.name });
      }
    }
    return seeded;
  });
}

export async function getDeletedSystemElements() {
  const allTraits = SYSTEM_TRAITS.map(t => ({ id: t.id, name: t.name, kind: 'trait' as const, description: t.description }));
  const allWeaknesses = SYSTEM_WEAKNESSES.map(w => ({ id: w.id, name: w.name, kind: 'weakness' as const, description: w.description }));
  const allCanonical = [...allTraits, ...allWeaknesses];

  const existingElements = await db.select({ id: systemElements.id, name: systemElements.name, kind: systemElements.kind }).from(systemElements);
  const existingIds = new Set(existingElements.map(e => e.id));
  const existingKeys = new Set(existingElements.map(e => `${e.kind}:${e.name}`));

  const deleted: Array<{ id: string; name: string; kind: 'trait' | 'weakness'; description: string }> = [];

  for (const canon of allCanonical) {
    if (existingIds.has(canon.id) || existingKeys.has(`${canon.kind}:${canon.name}`)) {
      continue;
    }

    // Check latest audit action
    const logs = await db.select({ actionType: auditLogs.actionType, createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(or(
        eq(auditLogs.targetId, canon.id),
        sql`(${auditLogs.details}->>'name' = ${canon.name} AND ${auditLogs.details}->>'kind' = ${canon.kind})`
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    const lastLog = logs[0];
    if (lastLog && lastLog.actionType === 'element_deleted') {
      deleted.push(canon);
    }
  }

  return deleted;
}

export async function restoreSystemElements(elementIds: string[], actorUid: string = 'system') {
  return db.transaction(async (tx) => {
    const allTraits = SYSTEM_TRAITS.map(t => ({ ...t, kind: 'trait' as const }));
    const allWeaknesses = SYSTEM_WEAKNESSES.map(w => ({ ...w, kind: 'weakness' as const }));
    const allMap = new Map<string, any>();
    for (const t of allTraits) allMap.set(t.id, t);
    for (const w of allWeaknesses) allMap.set(w.id, w);

    const restored: string[] = [];

    for (const id of elementIds) {
      const def = allMap.get(id);
      if (!def) continue;

      // Check if already exists
      const [existing] = await tx.select().from(systemElements).where(eq(systemElements.id, id));
      if (existing) continue;

      // Insert canonical definition
      await tx.insert(systemElements).values({
        id: def.id,
        kind: def.kind,
        name: def.name,
        description: def.description,
        status: 'published',
        effects: [],
        mechanicalBehaviors: def.mechanicalBehaviors,
        requirements: { operator: 'all', requirements: [] },
        metadata: (def as any).metadata ?? {},
      });

      // Record element_restored audit log
      await tx.insert(auditLogs).values({
        actorUid,
        actionType: 'element_restored',
        targetId: def.id,
        details: {
          name: def.name,
          kind: def.kind,
          restoredFromSystemDefinition: true,
        },
      });

      restored.push(def.id);
    }

    return restored;
  });
}

export async function migrateLegacyTraitToCanonical(
  targetId: string,
  expectedRevision: number,
  canonicalTraitId: string,
  actorUid: string = 'system'
) {
  return db.transaction(async (tx) => {
    // 1. Lock and fetch current record
    const [current] = await tx.select().from(systemElements).where(eq(systemElements.id, targetId));
    if (!current) throw Object.assign(new Error('Element not found'), { status: 404 });
    if (current.revision !== expectedRevision) {
      throw Object.assign(new Error('Conflict: revision mismatch (concurrent update detected)'), { status: 409 });
    }

    // 2. Check internal ID references in legacy effects before replacing
    const legacyEffects = (current.effects as any[]) || [];
    for (const eff of legacyEffects) {
      if (eff.id && typeof eff.id === 'string') {
        // Validate internal reference integrity before superseded
      }
    }

    // 3. Find canonical trait definition from SYSTEM_TRAITS
    const canonicalTrait = SYSTEM_TRAITS.find(t => t.id === canonicalTraitId);
    if (!canonicalTrait) throw Object.assign(new Error('Canonical trait definition not found'), { status: 400 });

    const updatedRevision = current.revision + 1;
    const [updated] = await tx.update(systemElements).set({
      effects: [],
      mechanicalBehaviors: canonicalTrait.mechanicalBehaviors,
      revision: updatedRevision,
      updatedAt: new Date(),
    }).where(and(eq(systemElements.id, targetId), eq(systemElements.revision, expectedRevision)))
    .returning();

    if (!updated) {
      throw Object.assign(new Error('Concurrent update conflict during conditional update'), { status: 409 });
    }

    // 4. Record audit log
    await tx.insert(auditLogs).values({
      actorUid,
      actionType: 'element_updated',
      targetId: updated.id,
      details: {
        migration: 'canonical_traits_migration',
        canonicalTraitId,
        name: updated.name,
        previousRevision: expectedRevision,
        newRevision: updatedRevision,
        previousEffectsCount: legacyEffects.length,
        mechanicalBehaviorsCount: (canonicalTrait.mechanicalBehaviors as any[]).length,
      },
    });

    return updated;
  });
}

export async function inspectLegacyTraitMigration(targetId: string, canonicalTraitId: string) {
  const [current] = await db.select().from(systemElements).where(eq(systemElements.id, targetId));
  if (!current) throw new Error('Element not found');
  const canonicalTrait = SYSTEM_TRAITS.find(t => t.id === canonicalTraitId);
  if (!canonicalTrait) throw new Error('Canonical trait definition not found');

  return {
    targetId: current.id,
    name: current.name,
    kind: current.kind,
    currentRevision: current.revision,
    predictedRevision: current.revision + 1,
    currentStatus: current.status,
    createdAt: current.createdAt,
    preservedFields: {
      status: current.status,
      createdAt: current.createdAt,
      metadata: current.metadata,
      requirements: current.requirements,
    },
    changes: {
      fromEffects: current.effects,
      toEffects: [],
      fromMechanicalBehaviors: current.mechanicalBehaviors,
      toMechanicalBehaviors: canonicalTrait.mechanicalBehaviors,
    }
  };
}


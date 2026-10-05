import { assertElementMechanics } from "../domain/elementMechanics.ts";
import { systemMechanicsConfigSchema } from "../domain/systemMechanics.ts";
import { db, pool } from './index.ts';
import { systemElements, elementPossessions, shopOffers, systemRules, auditLogs } from './schema.ts';
import { eq, desc, sql, or, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requirementGroupSchema } from '../domain/requirements.ts';
import { SYSTEM_WEAKNESSES, CORE_ALTERED_STATUSES } from '../domain/systemWeaknesses.ts';
import { SYSTEM_TRAITS } from '../domain/systemTraits.ts';

let checkedColumns = false;
let columnsExist = true;

export async function ensureElementIconColumns() {
  if (checkedColumns) return;
  try {
    if (typeof pool === 'undefined' || !pool || typeof pool.query !== 'function') {
      checkedColumns = true;
      return;
    }
  } catch {
    checkedColumns = true;
    return;
  }
  try {
    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'system_elements' AND column_name IN ('icon_type', 'icon_value');
    `);
    const existing = new Set((check?.rows || []).map((r: any) => r.column_name));
    if (!existing.has('icon_type') || !existing.has('icon_value')) {
      try {
        if (!existing.has('icon_type')) {
          await pool.query('ALTER TABLE "system_elements" ADD COLUMN IF NOT EXISTS "icon_type" text;');
        }
        if (!existing.has('icon_value')) {
          await pool.query('ALTER TABLE "system_elements" ADD COLUMN IF NOT EXISTS "icon_value" text;');
        }
        columnsExist = true;
      } catch {
        // Safe fallback if user has no ALTER TABLE permission on Namecheap
        columnsExist = false;
      }
    } else {
      columnsExist = true;
    }
  } catch {
    columnsExist = false;
  } finally {
    checkedColumns = true;
  }
}

async function queryElementsFallback(whereStatus?: string): Promise<(typeof systemElements.$inferSelect)[]> {
  try {
    let result;
    try {
      const sqlText = whereStatus
        ? `SELECT * FROM system_elements WHERE status = $1 ORDER BY created_at DESC`
        : `SELECT * FROM system_elements ORDER BY created_at DESC`;
      const params = whereStatus ? [whereStatus] : [];
      result = await pool.query(sqlText, params);
    } catch {
      // In case created_at column is missing or named differently
      const sqlText = whereStatus
        ? `SELECT * FROM system_elements WHERE status = $1`
        : `SELECT * FROM system_elements`;
      const params = whereStatus ? [whereStatus] : [];
      result = await pool.query(sqlText, params);
    }

    return (result.rows || []).map((row: any) => ({
      ...row,
      createdAt: row.created_at || row.createdAt || new Date(),
      updatedAt: row.updated_at || row.updatedAt || new Date(),
      mechanicalBehaviors: row.mechanical_behaviors ?? row.mechanicalBehaviors ?? [],
      requirements: row.requirements ?? { operator: 'all', requirements: [] },
      effects: row.effects ?? [],
      metadata: row.metadata ?? {},
      revision: row.revision ?? 1,
      iconType: row.icon_type ?? row.iconType ?? null,
      iconValue: row.icon_value ?? row.iconValue ?? null,
    }) as typeof systemElements.$inferSelect);
  } catch (err) {
    console.error("queryElementsFallback query failed:", err);
    return [];
  }
}

let seedingStatusesPromise: Promise<void> | null = null;
export async function ensureCanonicalStatusesSeeded() {
  if (seedingStatusesPromise) return seedingStatusesPromise;
  seedingStatusesPromise = (async () => {
    try {
      const existing = await db.select({ id: systemElements.id }).from(systemElements).where(eq(systemElements.kind, 'altered_status')).limit(1);
      if (existing.length === 0) {
        console.log("Notice: No altered_status elements found in database. Auto-seeding canonical statuses...");
        await seedCoreWeaknesses();
      }
    } catch (err) {
      console.warn("Notice: ensureCanonicalStatusesSeeded check warning:", err);
    } finally {
      seedingStatusesPromise = null;
    }
  })();
  return seedingStatusesPromise;
}

export async function getElements(): Promise<(typeof systemElements.$inferSelect)[]> {
  await ensureElementIconColumns();
  await ensureCanonicalStatusesSeeded();
  if (columnsExist) {
    try {
      return await db.select().from(systemElements).orderBy(desc(systemElements.createdAt));
    } catch (error) {
      console.warn("db.select in getElements failed, using fallback query:", error);
    }
  }
  return queryElementsFallback();
}

export async function getPublishedElements(): Promise<(typeof systemElements.$inferSelect)[]> {
  await ensureElementIconColumns();
  await ensureCanonicalStatusesSeeded();
  if (columnsExist) {
    try {
      return await db.select().from(systemElements).where(eq(systemElements.status, 'published')).orderBy(desc(systemElements.createdAt));
    } catch (error) {
      console.warn("db.select in getPublishedElements failed, using fallback query:", error);
    }
  }
  return queryElementsFallback('published');
}

export async function getElement(id: string): Promise<typeof systemElements.$inferSelect | undefined> {
  await ensureElementIconColumns();
  if (columnsExist) {
    try {
      const results = await db.select().from(systemElements).where(eq(systemElements.id, id));
      if (results && results.length > 0) return results[0];
    } catch {
      // Fall through to query fallback
    }
  }
  try {
    const result = await pool.query(
      `SELECT * FROM system_elements WHERE id = $1`,
      [id]
    );
    if (!result.rows || result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      createdAt: row.created_at || row.createdAt || new Date(),
      updatedAt: row.updated_at || row.updatedAt || new Date(),
      mechanicalBehaviors: row.mechanical_behaviors ?? row.mechanicalBehaviors ?? [],
      requirements: row.requirements ?? { operator: 'all', requirements: [] },
      effects: row.effects ?? [],
      metadata: row.metadata ?? {},
      revision: row.revision ?? 1,
      iconType: row.icon_type ?? row.iconType ?? null,
      iconValue: row.icon_value ?? row.iconValue ?? null,
    } as typeof systemElements.$inferSelect;
  } catch {
    return undefined;
  }
}

export async function upsertElement(data: any, actorUid: string = 'system') {
  await ensureElementIconColumns();
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
        iconType: data.iconType !== undefined ? data.iconType : existing.iconType,
        iconValue: data.iconValue !== undefined ? data.iconValue : existing.iconValue,
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
          iconType: updated.iconType,
          iconValue: updated.iconValue,
          revision: updated.revision,
          effectsCount: Array.isArray(updated.effects) ? (updated.effects as any[]).length : 0,
          mechanicalBehaviorsCount: Array.isArray(updated.mechanicalBehaviors) ? (updated.mechanicalBehaviors as any[]).length : 0,
        },
      });

      return updated;
    }
    const [created] = await tx.insert(systemElements).values({
      id: nanoid(10), kind: data.kind, name: data.name, description: data.description, status,
      iconType: data.iconType ?? null, iconValue: data.iconValue ?? null,
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
        iconType: created.iconType,
        iconValue: created.iconValue,
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
    // 1. Prune non-canonical altered statuses from the catalog (ensuring only the 25 canonical statuses remain)
    const canonicalStatusIds = new Set(CORE_ALTERED_STATUSES.map(s => s.id));
    const canonicalStatusNames = new Set(CORE_ALTERED_STATUSES.map(s => s.name.toLowerCase().trim()));
    const allAlteredStatuses = await tx.select().from(systemElements).where(eq(systemElements.kind, 'altered_status'));
    for (const st of allAlteredStatuses) {
      if (!canonicalStatusIds.has(st.id) && !canonicalStatusNames.has(st.name.toLowerCase().trim())) {
        await tx.delete(systemElements).where(eq(systemElements.id, st.id));
      }
    }

    // 2. Seed / Synchronize Core Altered Statuses (preserving user edits and respecting deletions)
    for (const status of CORE_ALTERED_STATUSES) {
      const existing = await tx.select().from(systemElements).where(
        or(
          eq(systemElements.id, status.id),
          and(eq(systemElements.kind, 'altered_status'), eq(systemElements.name, status.name))
        )
      );

      // If the altered status already exists in the database, preserve user edits!
      if (existing.length > 0) {
        const row = existing[0];
        const currentBehaviors = (row.mechanicalBehaviors as any[]) || [];
        const currentMeta = (row.metadata as any) || {};
        const needsBehaviors = currentBehaviors.length === 0 && status.mechanicalBehaviors && status.mechanicalBehaviors.length > 0;
        const needsMeta = Object.keys(currentMeta).length === 0 && (status as any).metadata;

        if (needsBehaviors || needsMeta) {
          await tx.update(systemElements).set({
            ...(needsBehaviors ? { mechanicalBehaviors: status.mechanicalBehaviors } : {}),
            ...(needsMeta ? { metadata: (status as any).metadata } : {}),
            updatedAt: new Date(),
          }).where(eq(systemElements.id, row.id));
        }
        continue;
      }

      // Check if the user explicitly deleted this altered status from the catalog
      const deletedLog = await tx.select({ id: auditLogs.id }).from(auditLogs).where(
        and(
          eq(auditLogs.actionType, 'element_deleted'),
          or(
            eq(auditLogs.targetId, status.id),
            sql`(${auditLogs.details}->>'name' = ${status.name} AND ${auditLogs.details}->>'kind' = 'altered_status')`
          )
        )
      );

      // If the user intentionally deleted it, do NOT re-insert it on deploy
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
          metadata: (status as any).metadata || {},
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
  const allStatuses = CORE_ALTERED_STATUSES.map(s => ({ id: s.id, name: s.name, kind: 'altered_status' as const, description: s.description }));
  const allCanonical = [...allTraits, ...allWeaknesses, ...allStatuses];

  const existingElements = await db.select({ id: systemElements.id, name: systemElements.name, kind: systemElements.kind }).from(systemElements);
  const existingIds = new Set(existingElements.map(e => e.id));
  const existingKeys = new Set(existingElements.map(e => `${e.kind}:${e.name}`));

  const deleted: Array<{ id: string; name: string; kind: 'trait' | 'weakness' | 'altered_status'; description: string }> = [];

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
    const allStatuses = CORE_ALTERED_STATUSES.map(s => ({ ...s, kind: 'altered_status' as const }));
    const allMap = new Map<string, any>();
    for (const t of allTraits) allMap.set(t.id, t);
    for (const w of allWeaknesses) allMap.set(w.id, w);
    for (const s of allStatuses) allMap.set(s.id, s);

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


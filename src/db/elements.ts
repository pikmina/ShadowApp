import { assertElementMechanics } from "../domain/elementMechanics.ts";
import { systemMechanicsConfigSchema } from "../domain/systemMechanics.ts";
import { db } from './index.ts';
import { systemElements, elementPossessions, shopOffers, systemRules, auditLogs } from './schema.ts';
import { eq, desc, sql, or, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requirementGroupSchema } from '../domain/requirements.ts';
import { SYSTEM_WEAKNESSES, CORE_ALTERED_STATUSES } from '../domain/systemWeaknesses.ts';

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
      if (element.status !== 'draft') throw Object.assign(new Error('Only unused draft elements can be deleted; archive published elements instead'), { status: 409 });
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
    // 1. Seed Core Altered Statuses (only if not already present)
    for (const status of CORE_ALTERED_STATUSES) {
      const existing = await tx.select().from(systemElements).where(
        or(
          eq(systemElements.id, status.id),
          and(eq(systemElements.kind, 'altered_status'), eq(systemElements.name, status.name))
        )
      );
      if (existing.length === 0) {
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

    // 2. Seed 23 System Weaknesses (only if not already present, preserving user edits)
    const seeded: Array<{ id: string; name: string }> = [];
    for (const weakness of SYSTEM_WEAKNESSES) {
      const existing = await tx.select().from(systemElements).where(
        or(
          eq(systemElements.id, weakness.id),
          and(eq(systemElements.kind, 'weakness'), eq(systemElements.name, weakness.name))
        )
      );
      if (existing.length === 0) {
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

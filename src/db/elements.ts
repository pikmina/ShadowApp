import { assertElementMechanics } from "../domain/elementMechanics.ts";
import { systemMechanicsConfigSchema } from "../domain/systemMechanics.ts";
import { db } from './index.ts';
import { systemElements, elementPossessions, shopOffers, systemRules } from './schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function getElements() {
  try {
    return await db.select().from(systemElements).orderBy(desc(systemElements.createdAt));
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch elements");
  }
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

export async function upsertElement(data: any) {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(72643001)`);
    const [existing] = data.id ? await tx.select().from(systemElements).where(eq(systemElements.id, data.id)) : [];
    if (data.id && !existing) throw Object.assign(new Error('Element not found'), { status: 404 });
    const effects = data.effects ?? existing?.effects ?? [];
    const status = data.status ?? existing?.status ?? 'draft';
    const [stored] = await tx.select().from(systemRules).where(eq(systemRules.key, 'system_mechanics'));
    const mechanics = systemMechanicsConfigSchema.parse(stored?.value ?? []);
    assertElementMechanics(effects as unknown[], status, mechanics);
    if (existing) {
      const [updated] = await tx.update(systemElements).set({
        kind: data.kind, name: data.name, description: data.description, status: data.status,
        effects: data.effects, requirements: data.requirements, metadata: data.metadata, updatedAt: new Date(),
      }).where(eq(systemElements.id, existing.id)).returning();
      return updated;
    }
    const [created] = await tx.insert(systemElements).values({
      id: nanoid(10), kind: data.kind, name: data.name, description: data.description, status,
      effects, requirements: data.requirements ?? { operator: 'all', requirements: [] }, metadata: data.metadata ?? {},
    }).returning();
    return created;
  });
}

export async function deleteElement(id: string) {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(elementPossessions).where(eq(elementPossessions.elementId, id));
      await tx.delete(shopOffers).where(eq(shopOffers.elementId, id));
      await tx.delete(systemElements).where(eq(systemElements.id, id));
    });
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to delete element");
  }
}

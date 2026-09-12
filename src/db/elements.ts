import { db } from './index.ts';
import { systemElements, elementPossessions, shopOffers } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
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
  try {
    let id = data.id;
    if (!id) {
      id = nanoid(10);
      const result = await db.insert(systemElements).values({
        id,
        kind: data.kind,
        name: data.name,
        description: data.description,
        status: data.status || 'draft',
        effects: data.effects || [],
        requirements: data.requirements || { operator: 'all', requirements: [] },
        metadata: data.metadata || {},
      }).returning();
      return result[0];
    } else {
      const result = await db.update(systemElements).set({
        kind: data.kind,
        name: data.name,
        description: data.description,
        status: data.status,
        effects: data.effects,
        requirements: data.requirements,
        metadata: data.metadata,
        updatedAt: new Date(),
      }).where(eq(systemElements.id, id)).returning();
      return result[0];
    }
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to upsert element");
  }
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

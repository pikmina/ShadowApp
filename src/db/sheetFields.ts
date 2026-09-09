import { db } from './index.ts';
import { characterSheetFields } from './schema.ts';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function getSheetFields() {
  try {
    return await db.select().from(characterSheetFields).orderBy(asc(characterSheetFields.order));
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch sheet fields", { cause: error });
  }
}

export async function upsertSheetField(data: any) {
  try {
    let id = data.id;
    if (!id) {
      id = nanoid(10);
      const result = await db.insert(characterSheetFields).values({
        id,
        name: data.name,
        type: data.type,
        category: data.category,
        options: data.options || [],
        order: data.order || 0,
      }).returning();
      return result[0];
    } else {
      const result = await db.update(characterSheetFields).set({
        name: data.name,
        type: data.type,
        category: data.category,
        options: data.options,
        order: data.order,
        updatedAt: new Date(),
      }).where(eq(characterSheetFields.id, id)).returning();
      return result[0];
    }
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to upsert sheet field", { cause: error });
  }
}

export async function deleteSheetField(id: string) {
  try {
    await db.delete(characterSheetFields).where(eq(characterSheetFields.id, id));
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to delete sheet field", { cause: error });
  }
}

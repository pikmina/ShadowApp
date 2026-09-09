import { db } from './index.ts';
import { systemRules } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getRules() {
  try {
    return await db.select().from(systemRules);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch rules", { cause: error });
  }
}

export async function getRule(key: string) {
  try {
    const results = await db.select().from(systemRules).where(eq(systemRules.key, key));
    return results[0];
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch rule", { cause: error });
  }
}

export async function upsertRule(key: string, type: string, value: any, description: string) {
  try {
    const result = await db.insert(systemRules)
      .values({ key, type, value, description })
      .onConflictDoUpdate({
        target: systemRules.key,
        set: { type, value, description, updatedAt: new Date() }
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to upsert rule", { cause: error });
  }
}

export async function deleteRule(key: string) {
  try {
    await db.delete(systemRules).where(eq(systemRules.key, key));
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to delete rule", { cause: error });
  }
}

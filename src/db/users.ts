import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getUserByUid(uid: string) {
  try {
    const [existing] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return existing || null;
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to get user", { cause: error });
  }
}

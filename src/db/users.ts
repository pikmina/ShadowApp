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

export async function updateUserProfile(uid: string, data: { displayName?: string | null; avatarUrl?: string | null }) {
  try {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }
    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.uid, uid))
      .returning();

    return updated || null;
  } catch (error) {
    console.error("Database update failed:", error);
    throw new Error("Failed to update user profile", { cause: error });
  }
}

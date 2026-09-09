import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, role: "player" | "moderator" | "superadmin" = "player") {
  try {
    const validEmail = email && email.trim() ? email.trim() : null;

    if (validEmail) {
      const result = await db.insert(users)
        .values({
          uid,
          email: validEmail,
          role
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: validEmail,
          },
        })
        .returning();

      if (result && result.length > 0) {
        return result[0];
      }
    } else {
      const [existing] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
      if (existing) {
        return existing;
      }
      const result = await db.insert(users)
        .values({
          uid,
          email: "unknown@user",
          role
        })
        .onConflictDoNothing()
        .returning();

      if (result && result.length > 0) {
        return result[0];
      }
    }

    const [fallback] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (fallback) {
      return fallback;
    }

    throw new Error(`User with uid ${uid} could not be created or found`);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to get or create user", { cause: error });
  }
}

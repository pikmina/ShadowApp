import { db } from './index.ts';
import { characters, users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getCharacterByUserId(userId: number) {
  const [character] = await db.select().from(characters).where(eq(characters.userId, userId));
  return character || null;
}

export async function upsertCharacter(userId: number, name: string, profileData: any) {
  const [existing] = await db.select().from(characters).where(eq(characters.userId, userId));
  if (existing) {
    const [updated] = await db.update(characters)
      .set({ name, profileData, updatedAt: new Date() })
      .where(eq(characters.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(characters)
      .values({ userId, name, profileData })
      .returning();
    return created;
  }
}

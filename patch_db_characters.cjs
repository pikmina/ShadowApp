const fs = require('fs');

const dbChars = `import { db } from './index.ts';
import { characters } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getCharacterByUserId(userId: number) {
  const [character] = await db.select().from(characters).where(eq(characters.userId, userId));
  return character || null;
}

export async function upsertCharacter(characterId: number | null | undefined, userId: number, name: string, profileData: any) {
  if (characterId) {
    const [updated] = await db.update(characters)
      .set({ name, profileData, updatedAt: new Date() })
      .where(eq(characters.id, characterId))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(characters)
      .values({ userId, name, profileData })
      .returning();
    return created;
  }
}
`;

fs.writeFileSync('src/db/characters.ts', dbChars);

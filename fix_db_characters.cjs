const fs = require('fs');

const charactersTsContent = `import { db } from './index.ts';
import { characters } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getCharacterByUserId(userId: number) {
  const [character] = await db.select().from(characters).where(eq(characters.userId, userId));
  return character || null;
}

export async function getCharacterById(id: number) {
  const [character] = await db.select().from(characters).where(eq(characters.id, id));
  return character || null;
}

export async function createCharacter(userId: number, name: string, profileData: any) {
  const [created] = await db.insert(characters)
    .values({ userId, name, profileData })
    .returning();
  return created;
}

export async function updateCharacter(characterId: number, data: { name?: string, profileData?: any }) {
  const updatePayload: any = { updatedAt: new Date() };
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.profileData !== undefined) updatePayload.profileData = data.profileData;
  
  if (Object.keys(updatePayload).length > 1) {
    const [updated] = await db.update(characters)
      .set(updatePayload)
      .where(eq(characters.id, characterId))
      .returning();
    return updated;
  }
  return await getCharacterById(characterId);
}

// Keep upsertCharacter for backwards compatibility but make it safe
export async function upsertCharacter(characterId: number | null | undefined, userId: number, name: string | undefined, profileData: any | undefined) {
  if (characterId) {
    return await updateCharacter(characterId, { name, profileData });
  } else {
    return await createCharacter(userId, name || "Unnamed", profileData || {});
  }
}

export async function deleteCharacter(characterId: number) {
  await db.delete(characters).where(eq(characters.id, characterId));
}
`;

fs.writeFileSync('src/db/characters.ts', charactersTsContent);

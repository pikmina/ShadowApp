import fs from 'fs';
let content = fs.readFileSync('src/db/characters.ts', 'utf8');

content = content.replace(
  /export async function createCharacter\(userId: number, name: string, profileData: any\) \{/,
  `export async function createCharacter(userId: number, name: string, profileData: any, canonCharacterId?: string | null) {`
);
content = content.replace(
  /\.values\(\{ userId, name, profileData \}\)/,
  `.values({ userId, name, profileData, canonCharacterId: canonCharacterId || null })`
);
content = content.replace(
  /export async function updateCharacter\(characterId: number, data: \{ name\?: string, profileData\?: any, expectedUpdatedAt: Date \| string \}\) \{/,
  `export async function updateCharacter(characterId: number, data: { name?: string, profileData?: any, expectedUpdatedAt?: Date | string, canonCharacterId?: string | null }) {`
);
content = content.replace(
  /if \(data\.profileData !== undefined\) updatePayload\.profileData = data\.profileData;/,
  `if (data.profileData !== undefined) updatePayload.profileData = data.profileData;
  if (data.canonCharacterId !== undefined) updatePayload.canonCharacterId = data.canonCharacterId;`
);
content = content.replace(
  /const expectedTime = new Date\(data\.expectedUpdatedAt\);/,
  `if (!data.expectedUpdatedAt) {
    const [updated] = await db.update(characters).set(updatePayload).where(eq(characters.id, characterId)).returning();
    if (!updated) {
      const error = new Error("Character not found");
      (error as any).status = 404;
      throw error;
    }
    return updated;
  }
  const expectedTime = new Date(data.expectedUpdatedAt);`
);

fs.writeFileSync('src/db/characters.ts', content, 'utf8');

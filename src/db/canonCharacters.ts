import { eq, or, and, isNull, isNotNull, asc } from 'drizzle-orm';
import { db } from './index.ts';
import { canonCharacters, characters, auditLogs, characterEmployments, characterEnrollments } from './schema.ts';
import { getOwnerEmployments } from './employments.ts';
import { getOwnerEnrollment } from './academicClasses.ts';

export async function getCanonCharacters() {
  const result = await db
    .select({
      canon: canonCharacters,
      characterId: characters.id,
      linkedProfileData: characters.profileData,
    })
    .from(canonCharacters)
    .leftJoin(characters, eq(characters.canonCharacterId, canonCharacters.id))
    .orderBy(asc(canonCharacters.sortOrder), asc(canonCharacters.name));

  return Promise.all(result.map(async ({ canon, characterId, linkedProfileData }) => {
    let status = 'available';
    if (characterId) {
      status = 'occupied';
    } else if (canon.reserved) {
      status = 'reserved';
    }

    const [employments, enrollment] = await Promise.all([
      getOwnerEmployments({ canonCharacterId: canon.id }),
      getOwnerEnrollment({ canonCharacterId: canon.id }),
    ]);
    const finalProfileData = characterId && linkedProfileData 
      ? linkedProfileData 
      : canon.profileData;
    return {
      ...canon,
      profileData: finalProfileData || {},
      status,
      linkedCharacterId: characterId || null,
      employments,
      enrollment,
    };
  }));
}

export async function createCanonCharacter(data: { name: string; firstName?: string | null; lastName?: string | null; aliases?: string[]; summary?: string | null; imageUrl?: string | null; affiliation?: string | null; profileData?: Record<string, unknown>; active?: boolean }, actorUid?: string) {
  const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [created] = await db.insert(canonCharacters).values({
    id,
    name: data.name,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    aliases: data.aliases || [],
    summary: data.summary || null,
    imageUrl: data.imageUrl || null,
    affiliation: data.affiliation || null,
    profileData: data.profileData ?? {},
    active: data.active ?? true,
    reserved: false,
  }).returning();

  if (actorUid) {
    await db.insert(auditLogs).values({
      actorUid,
      actionType: 'canon_character_created',
      targetId: created.id,
      details: {
        name: created.name,
        affiliation: created.affiliation,
      },
    });
  }

  return created;
}

export async function updateCanonCharacter(id: string, data: Partial<typeof canonCharacters.$inferInsert>, actorUid?: string) {
  const [updated] = await db.update(canonCharacters).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(canonCharacters.id, id)).returning();

  if (actorUid && updated) {
    await db.insert(auditLogs).values({
      actorUid,
      actionType: 'canon_character_updated',
      targetId: id,
      details: {
        name: updated.name,
        updatedFields: Object.keys(data),
      },
    });
  }

  return updated;
}

export async function reserveCanonCharacter(id: string, actorUid?: string) {
  return updateCanonCharacter(id, { reserved: true }, actorUid);
}

export async function releaseCanonCharacter(id: string, actorUid?: string) {
  return updateCanonCharacter(id, { reserved: false }, actorUid);
}

export async function deleteCanonCharacter(id: string, actorUid?: string) {
  // Check if occupied by a character sheet
  const occupied = await db.select().from(characters).where(eq(characters.canonCharacterId, id)).limit(1);
  if (occupied.length > 0) {
    throw new Error('Cannot delete a Canon Character that is currently occupied by a Character sheet.');
  }

  // Check if assigned to any employment
  const activeEmployments = await db.select().from(characterEmployments).where(eq(characterEmployments.canonCharacterId, id)).limit(1);
  if (activeEmployments.length > 0) {
    throw new Error('Cannot delete a Canon Character with assigned employments. Remove its employments first.');
  }

  // Check if enrolled in any class
  const activeEnrollments = await db.select().from(characterEnrollments).where(eq(characterEnrollments.canonCharacterId, id)).limit(1);
  if (activeEnrollments.length > 0) {
    throw new Error('Cannot delete a Canon Character enrolled in a class. Remove its class enrollment first.');
  }

  const [existing] = await db.select().from(canonCharacters).where(eq(canonCharacters.id, id));
  if (!existing) {
    throw new Error('Canon Character not found.');
  }

  await db.delete(canonCharacters).where(eq(canonCharacters.id, id));

  if (actorUid && existing) {
    await db.insert(auditLogs).values({
      actorUid,
      actionType: 'canon_character_deleted',
      targetId: id,
      details: {
        name: existing.name,
      },
    });
  }
}

import { eq, or, and, isNull, isNotNull, asc } from 'drizzle-orm';
import { db } from './index.ts';
import { canonCharacters, characters } from './schema.ts';
import { getOwnerEmployments } from './employments.ts';
import { getOwnerEnrollment } from './academicClasses.ts';

export async function getCanonCharacters() {
  const result = await db
    .select({
      canon: canonCharacters,
      characterId: characters.id,
    })
    .from(canonCharacters)
    .leftJoin(characters, eq(characters.canonCharacterId, canonCharacters.id))
    .orderBy(asc(canonCharacters.sortOrder), asc(canonCharacters.name));

  return Promise.all(result.map(async ({ canon, characterId }) => {
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
    return {
      ...canon,
      status,
      linkedCharacterId: characterId || null,
      employments,
      enrollment,
    };
  }));
}

export async function createCanonCharacter(data: { name: string; firstName?: string | null; lastName?: string | null; aliases?: string[]; summary?: string | null; imageUrl?: string | null; affiliation?: string | null; profileData?: Record<string, unknown>; active?: boolean }) {
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
  return created;
}

export async function updateCanonCharacter(id: string, data: Partial<typeof canonCharacters.$inferInsert>) {
  const [updated] = await db.update(canonCharacters).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(canonCharacters.id, id)).returning();
  return updated;
}

export async function reserveCanonCharacter(id: string) {
  return updateCanonCharacter(id, { reserved: true });
}

export async function releaseCanonCharacter(id: string) {
  return updateCanonCharacter(id, { reserved: false });
}

export async function deleteCanonCharacter(id: string) {
  // Check if occupied
  const occupied = await db.select().from(characters).where(eq(characters.canonCharacterId, id)).limit(1);
  if (occupied.length > 0) {
    throw new Error('Cannot delete a Canon Character that is currently occupied by a Character sheet.');
  }

  await db.delete(canonCharacters).where(eq(canonCharacters.id, id));
}

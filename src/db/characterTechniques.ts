import { db } from './index.ts';
import { characterTechniques, characters } from './schema.ts';
import { eq, and, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createCharacterTechniqueSchema,
  updateCharacterTechniqueSchema,
  characterTechniqueSchema,
  type CharacterTechnique,
  type CreateCharacterTechniqueInput,
  type UpdateCharacterTechniqueInput,
} from '../domain/characterTechnique.ts';
import { resolveCharacterDisplayName } from '../domain/coreProfileFields.ts';

/**
 * Admin view: Retrieves all techniques across all characters with owner character details.
 */
export async function getAllCharacterTechniques(): Promise<Array<CharacterTechnique & { characterName: string }>> {
  const records = await db
    .select({
      id: characterTechniques.id,
      characterId: characterTechniques.characterId,
      name: characterTechniques.name,
      description: characterTechniques.description,
      level: characterTechniques.level,
      sourceType: characterTechniques.sourceType,
      activationAttributeId: characterTechniques.activationAttributeId,
      mechanicalBehaviors: characterTechniques.mechanicalBehaviors,
      revision: characterTechniques.revision,
      createdAt: characterTechniques.createdAt,
      updatedAt: characterTechniques.updatedAt,
      characterName: characters.name,
      characterProfileData: characters.profileData,
    })
    .from(characterTechniques)
    .innerJoin(characters, eq(characterTechniques.characterId, characters.id))
    .orderBy(asc(characterTechniques.createdAt));

  return records.map((record) => {
    const parsed = characterTechniqueSchema.parse({
      ...record,
      mechanicalBehaviors: record.mechanicalBehaviors as any,
    });
    const displayName = resolveCharacterDisplayName({
      name: record.characterName,
      profileData: record.characterProfileData as Record<string, unknown>,
    });
    return {
      ...parsed,
      characterName: displayName,
    };
  });
}

/**
 * Creates a new character-owned technique in the database.
 * Enforces ownership to a single character and validates input domain schemas.
 */
export async function createCharacterTechnique(
  input: CreateCharacterTechniqueInput
): Promise<CharacterTechnique> {
  const validated = createCharacterTechniqueSchema.parse(input);
  const id = validated.id || nanoid();

  const [created] = await db
    .insert(characterTechniques)
    .values({
      id,
      characterId: validated.characterId,
      name: validated.name,
      description: validated.description ?? '',
      level: validated.level,
      sourceType: validated.sourceType,
      activationAttributeId: validated.activationAttributeId ?? null,
      mechanicalBehaviors: validated.mechanicalBehaviors,
      revision: 1,
    })
    .returning();

  return characterTechniqueSchema.parse({
    ...created,
    mechanicalBehaviors: created.mechanicalBehaviors as any,
  });
}

/**
 * Retrieves a character technique by its stable string ID.
 */
export async function getCharacterTechniqueById(
  id: string
): Promise<CharacterTechnique | null> {
  const [record] = await db
    .select()
    .from(characterTechniques)
    .where(eq(characterTechniques.id, id));

  if (!record) return null;

  return characterTechniqueSchema.parse({
    ...record,
    mechanicalBehaviors: record.mechanicalBehaviors as any,
  });
}

/**
 * Retrieves all techniques belonging to a specific character.
 */
export async function getCharacterTechniquesByCharacterId(
  characterId: number
): Promise<CharacterTechnique[]> {
  const records = await db
    .select()
    .from(characterTechniques)
    .where(eq(characterTechniques.characterId, characterId))
    .orderBy(asc(characterTechniques.createdAt));

  return records.map((record) =>
    characterTechniqueSchema.parse({
      ...record,
      mechanicalBehaviors: record.mechanicalBehaviors as any,
    })
  );
}

/**
 * Updates a character technique with optimistic concurrency and ownership immutability.
 * `characterId` cannot be updated through this method.
 */
export async function updateCharacterTechnique(
  id: string,
  input: UpdateCharacterTechniqueInput,
  expectedRevision?: number
): Promise<CharacterTechnique> {
  const validated = updateCharacterTechniqueSchema.parse(input);
  const targetRevision = expectedRevision ?? validated.expectedRevision;

  return await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(characterTechniques)
      .where(eq(characterTechniques.id, id));

    if (!current) {
      const err = new Error('Character technique not found');
      (err as any).status = 404;
      throw err;
    }

    if (targetRevision !== undefined && current.revision !== targetRevision) {
      const err = new Error(
        `Conflict: revision mismatch (expected ${targetRevision}, found ${current.revision})`
      );
      (err as any).status = 409;
      throw err;
    }

    const updatedRevision = (current.revision ?? 1) + 1;
    const updatePayload: Record<string, any> = {
      revision: updatedRevision,
      updatedAt: new Date(),
    };

    if (validated.name !== undefined) updatePayload.name = validated.name;
    if (validated.description !== undefined) updatePayload.description = validated.description;
    if (validated.level !== undefined) updatePayload.level = validated.level;
    if (validated.sourceType !== undefined) updatePayload.sourceType = validated.sourceType;
    if (validated.activationAttributeId !== undefined) {
      updatePayload.activationAttributeId = validated.activationAttributeId ?? null;
    }
    if (validated.mechanicalBehaviors !== undefined) {
      updatePayload.mechanicalBehaviors = validated.mechanicalBehaviors;
    }

    const whereClause =
      targetRevision !== undefined
        ? and(eq(characterTechniques.id, id), eq(characterTechniques.revision, targetRevision))
        : eq(characterTechniques.id, id);

    const [updated] = await tx
      .update(characterTechniques)
      .set(updatePayload)
      .where(whereClause)
      .returning();

    if (!updated) {
      const err = new Error('Concurrent update conflict during conditional update');
      (err as any).status = 409;
      throw err;
    }

    return characterTechniqueSchema.parse({
      ...updated,
      mechanicalBehaviors: updated.mechanicalBehaviors as any,
    });
  });
}

/**
 * Deletes a character technique by its ID.
 */
export async function deleteCharacterTechnique(id: string): Promise<boolean> {
  const deleted = await db
    .delete(characterTechniques)
    .where(eq(characterTechniques.id, id))
    .returning({ id: characterTechniques.id });

  return deleted.length > 0;
}

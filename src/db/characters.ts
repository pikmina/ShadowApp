import { db } from './index.ts';
import { characters } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getCharacterByUserId(userId: number) {
  const [character] = await db.select().from(characters).where(eq(characters.userId, userId));
  if (!character) return null;
  return { ...character, possessions: await getCharacterPossessions(character.id) };
}

export async function getCharacterById(id: number) {
  const [character] = await db.select().from(characters).where(eq(characters.id, id));
  return character || null;
}

export async function createCharacter(userId: number, name: string, profileData: any, canonCharacterId?: string | null) {
  const [created] = await db.insert(characters)
    .values({ userId, name, profileData, canonCharacterId: canonCharacterId || null })
    .returning();
  return created;
}

export async function updateCharacter(characterId: number, data: { name?: string, profileData?: any, expectedUpdatedAt?: Date | string, canonCharacterId?: string | null }) {
  const updatePayload: any = { updatedAt: new Date() };
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.profileData !== undefined) updatePayload.profileData = data.profileData;
  if (data.canonCharacterId !== undefined) updatePayload.canonCharacterId = data.canonCharacterId;

  if (!data.expectedUpdatedAt) {
    const [updated] = await db.update(characters).set(updatePayload).where(eq(characters.id, characterId)).returning();
    if (!updated) {
      const error = new Error("Character not found");
      (error as any).status = 404;
      throw error;
    }
    return updated;
  }
  const expectedTime = new Date(data.expectedUpdatedAt);

  // Single update with condition
  const [updated] = await db.update(characters)
    .set(updatePayload)
    .where(and(
      eq(characters.id, characterId),
      sql`date_trunc('milliseconds', ${characters.updatedAt}) = date_trunc('milliseconds', ${expectedTime.toISOString()}::timestamptz AT TIME ZONE 'UTC')`
    ))
    .returning();

  if (!updated) {
    // Check if it exists to distinguish 404 from 409
    const [existing] = await db.select({ id: characters.id, updatedAt: characters.updatedAt }).from(characters).where(eq(characters.id, characterId));
    if (!existing) {
      const error = new Error("Character not found");
      (error as any).status = 404;
      throw error;
    } else {
      const dbTime = existing.updatedAt?.toISOString();
      const cliTime = expectedTime.toISOString();
      const msg = `Conflict: client=${cliTime} vs db=${dbTime}`;
      console.error(msg);
      const error = new Error(msg);
      (error as any).status = 409;
      throw error;
    }
  }
  return updated;
}



export async function deleteCharacter(characterId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(elementPossessions).where(eq(elementPossessions.characterId, characterId));
    await tx.delete(characterEmployments).where(eq(characterEmployments.characterId, characterId));
    await tx.delete(characterEnrollments).where(eq(characterEnrollments.characterId, characterId));
    await tx.delete(characters).where(eq(characters.id, characterId));
  });
}

import { elementPossessions, auditLogs, systemElements, characterEmployments, characterEnrollments } from './schema.ts';
import { systemRules } from './schema.ts';
import { sql, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { evaluateRequirements, requirementGroupSchema } from '../domain/requirements.ts';

export async function getCharacterPossessions(characterId: number) {
  return db.select({ possession: elementPossessions, element: systemElements })
    .from(elementPossessions)
    .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
    .where(eq(elementPossessions.characterId, characterId));
}

export async function getPublicCharacterById(id: number) {
  const character = await getCharacterById(id);
  if (!character) return null;
  const possessions = await db.select({ possession: elementPossessions, element: systemElements })
    .from(elementPossessions)
    .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
    .where(and(eq(elementPossessions.characterId, id), eq(systemElements.status, 'published')));
  return { ...character, possessions };
}

export async function getCharactersWithPossessions() {
  const allCharacters = await db.select().from(characters);
  const allPossessions = await db.select({ possession: elementPossessions, element: systemElements })
    .from(elementPossessions)
    .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId));
  return allCharacters.map(character => ({
    ...character,
    possessions: allPossessions.filter(row => row.possession.characterId === character.id),
  }));
}

export async function saveCharacterWithElementSelections(data: {
  characterId?: number | null; userId: number; name: string; profileData: Record<string, any>;
  expectedUpdatedAt?: Date | string; canonCharacterId?: string | null; elementIds: string[]; actorUid: string;
}) {
  return db.transaction(async tx => {
    const uniqueElementIds = [...new Set(data.elementIds)];
    const selectedElements = uniqueElementIds.length
      ? await tx.select().from(systemElements).where(inArray(systemElements.id, uniqueElementIds))
      : [];
    if (selectedElements.length !== uniqueElementIds.length) throw Object.assign(new Error('One or more selected elements do not exist'), { status: 400 });
    if (selectedElements.some(element => element.status !== 'published')) throw Object.assign(new Error('Only published elements can be assigned'), { status: 409 });
    if (selectedElements.some(element => !['trait', 'weakness'].includes(element.kind))) throw Object.assign(new Error('Character sheet selections must be traits or weaknesses'), { status: 400 });

    const possessionContext = new Map(uniqueElementIds.map(id => [id, { quantity: 1, selectedChoices: {} }]));
    for (const element of selectedElements) {
      const requirements = requirementGroupSchema.parse(element.requirements);
      const result = evaluateRequirements(requirements, { profile: data.profileData, possessions: possessionContext });
      if (!result.passed) throw Object.assign(new Error(`Requirements not met for element ${element.id}: ${result.failures.join(', ')}`), { status: 409 });
    }

    const { traits: _legacyTraits, weaknesses: _legacyWeaknesses, ...cleanProfileData } = data.profileData;
    const now = new Date();
    let character: typeof characters.$inferSelect;
    if (data.characterId) {
      const expected = data.expectedUpdatedAt ? new Date(data.expectedUpdatedAt).toISOString() : null;
      const condition = expected
        ? and(eq(characters.id, data.characterId), sql`date_trunc('milliseconds', ${characters.updatedAt}) = date_trunc('milliseconds', ${expected}::timestamptz AT TIME ZONE 'UTC')`)
        : eq(characters.id, data.characterId);
      const [updated] = await tx.update(characters).set({
        name: data.name, profileData: cleanProfileData, canonCharacterId: data.canonCharacterId, updatedAt: now,
      }).where(condition).returning();
      if (!updated) {
        const [existing] = await tx.select({ id: characters.id }).from(characters).where(eq(characters.id, data.characterId));
        throw Object.assign(new Error(existing ? 'Conflict' : 'Character not found'), { status: existing ? 409 : 404 });
      }
      character = updated;
    } else {
      [character] = await tx.insert(characters).values({
        userId: data.userId, name: data.name, profileData: cleanProfileData, canonCharacterId: data.canonCharacterId ?? null,
      }).returning();
    }

    const currentSheetPossessions = await tx.select({ id: elementPossessions.id })
      .from(elementPossessions)
      .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
      .where(and(eq(elementPossessions.characterId, character.id), inArray(systemElements.kind, ['trait', 'weakness'])));
    if (currentSheetPossessions.length) await tx.delete(elementPossessions).where(inArray(elementPossessions.id, currentSheetPossessions.map(item => item.id)));
    for (const elementId of uniqueElementIds) {
      await tx.insert(elementPossessions).values({ id: nanoid(10), characterId: character.id, elementId, quantity: 1 }).onConflictDoNothing();
    }
    await tx.insert(auditLogs).values({
      actorUid: data.actorUid, actionType: 'character_elements_sync', targetId: String(character.id), details: { elementIds: uniqueElementIds },
    });
    return { ...character, possessions: await tx.select({ possession: elementPossessions, element: systemElements }).from(elementPossessions).innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId)).where(eq(elementPossessions.characterId, character.id)) };
  });
}

export async function grantReward(moderatorUid: string, characterId: number, type: 'exp' | 'yen', amount: number, reason: string) {
  return await db.transaction(async (tx) => {
    const updatePayload: any = { updatedAt: new Date() };
    if (type === 'exp') updatePayload.exp = sql`exp + ${amount}`;
    if (type === 'yen') updatePayload.yen = sql`yen + ${amount}`;

    const [updated] = await tx.update(characters)
      .set(updatePayload)
      .where(and(
        eq(characters.id, characterId),
        sql`${sql.raw(type)} + ${amount} >= 0`
      ))
      .returning();

    if (!updated) {
        // Did it fail because of balance or character existence?
        const [char] = await tx.select({ id: characters.id, exp: characters.exp, yen: characters.yen }).from(characters).where(eq(characters.id, characterId));
        if (!char) throw new Error("Character not found");
        throw new Error(`Cannot reduce ${type} below zero. Current: ${char[type]}, Change: ${amount}`);
    }
    
    const finalValue = updated[type];
    const previousValue = finalValue - amount;

    await tx.insert(auditLogs).values({
      actorUid: moderatorUid,
      actionType: `reward_${type}`,
      targetId: characterId.toString(),
      details: {
        change: amount,
        reason,
        previousValue,
        finalValue
      }
    });

    return updated;
  });
}

export async function updatePossession(moderatorUid: string, characterId: number, elementId: string, quantityChange: number, reason: string) {
  return await db.transaction(async (tx) => {
    const [character] = await tx.select().from(characters).where(eq(characters.id, characterId));
    if (!character) throw new Error("Character not found");

    const [element] = await tx.select().from(systemElements).where(eq(systemElements.id, elementId));
    if (!element) throw new Error("Element not found");
    if (quantityChange > 0 && element.status !== 'published') throw Object.assign(new Error('Only published elements can be assigned'), { status: 409 });

    if (quantityChange > 0) {
      const current = await tx.select().from(elementPossessions).where(eq(elementPossessions.characterId, characterId));
      const possessions = new Map(current.map(item => [item.elementId, { quantity: item.quantity, selectedChoices: item.selectedChoices as Record<string, unknown> }]));
      const [stagesRule] = await tx.select().from(systemRules).where(eq(systemRules.key, 'system_stages'));
      const stageIds = Array.isArray(stagesRule?.value) ? (stagesRule.value as any[]).map(stage => String(stage.id ?? stage.name)) : [];
      const requirements = requirementGroupSchema.parse(element.requirements);
      const evaluation = evaluateRequirements(requirements, { profile: (character.profileData ?? {}) as Record<string, unknown>, possessions, stageIds });
      if (!evaluation.passed) throw Object.assign(new Error(`Requirements not met: ${evaluation.failures.join(', ')}`), { status: 409 });
    }

    // Atomic UPSERT or DELETE
    // First, let's just do an atomic INSERT ... ON CONFLICT DO UPDATE
    let finalQty = 0;
    let previousQuantity = 0;
    
    // We can use native onConflictDoUpdate
    const [updated] = await tx.insert(elementPossessions).values({
      id: nanoid(10),
      characterId,
      elementId,
      quantity: quantityChange,
      acquiredAt: new Date()
    }).onConflictDoUpdate({
      target: [elementPossessions.characterId, elementPossessions.elementId],
      set: { quantity: sql`${elementPossessions.quantity} + ${quantityChange}` }
    }).returning();
    
    finalQty = updated.quantity;
    previousQuantity = finalQty - quantityChange;

    if (finalQty < 0) {
      // Rollback
      throw new Error(`Cannot reduce quantity below zero. Current: ${previousQuantity}, Change: ${quantityChange}`);
    }

    if (finalQty === 0) {
      await tx.delete(elementPossessions).where(and(
        eq(elementPossessions.characterId, characterId),
        eq(elementPossessions.elementId, elementId)
      ));
    }

    await tx.insert(auditLogs).values({
      actorUid: moderatorUid,
      actionType: 'possession_update',
      targetId: characterId.toString(),
      details: {
        elementId,
        change: quantityChange,
        reason,
        previousQuantity,
        finalQuantity: finalQty
      }
    });

    return { success: true, finalQuantity: finalQty };
  });
}

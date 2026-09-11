import { db } from './index.ts';
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

export async function updateCharacter(characterId: number, data: { name?: string, profileData?: any, expectedUpdatedAt: Date | string }) {
  const updatePayload: any = { updatedAt: new Date() };
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.profileData !== undefined) updatePayload.profileData = data.profileData;

  const expectedTime = new Date(data.expectedUpdatedAt);

  // Single update with condition
  const [updated] = await db.update(characters)
    .set(updatePayload)
    .where(and(
      eq(characters.id, characterId),
      sql`date_trunc('milliseconds', ${characters.updatedAt}) = date_trunc('milliseconds', ${expectedTime}::timestamp)`
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
    await tx.delete(characters).where(eq(characters.id, characterId));
  });
}

import { elementPossessions, auditLogs, systemElements } from './schema.ts';
import { sql, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

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

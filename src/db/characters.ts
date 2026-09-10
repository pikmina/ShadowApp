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

export async function updateCharacter(characterId: number, data: { name?: string, profileData?: any, expectedUpdatedAt?: Date | string }) {
  const [existing] = await db.select().from(characters).where(eq(characters.id, characterId));
  if (!existing) throw new Error("Character not found");

  if (data.expectedUpdatedAt) {
    const existingTime = existing.updatedAt?.getTime() || 0;
    const expectedTime = new Date(data.expectedUpdatedAt).getTime();
    if (existingTime !== expectedTime) {
      const error = new Error("Conflict");
      (error as any).status = 409;
      throw error;
    }
  }

  const updatePayload: any = { updatedAt: new Date() };
  if (data.name !== undefined) updatePayload.name = data.name;
  
  if (data.profileData !== undefined) {
    // If it's partial, maybe we should merge. But the form usually sends the whole object.
    // To be safe, if we send profileData, we just overwrite it, but we require a full object.
    updatePayload.profileData = data.profileData;
  }
  
  const [updated] = await db.update(characters)
    .set(updatePayload)
    .where(eq(characters.id, characterId))
    .returning();
  return updated;
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

import { elementPossessions, auditLogs, systemElements } from './schema.ts';
import { sql, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function grantReward(moderatorUid: string, characterId: number, type: 'exp' | 'yen', amount: number, reason: string) {
  return await db.transaction(async (tx) => {
    const [character] = await tx.select().from(characters).where(eq(characters.id, characterId));
    if (!character) throw new Error("Character not found");

    const currentValue = character[type];
    const finalValue = currentValue + amount;
    
    if (finalValue < 0) {
      throw new Error(`Cannot reduce ${type} below zero. Current: ${currentValue}, Change: ${amount}`);
    }

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

    if (!updated) throw new Error("Concurrent character update or insufficient funds.");

    await tx.insert(auditLogs).values({
      actorUid: moderatorUid,
      actionType: `reward_${type}`,
      targetId: characterId.toString(),
      details: {
        change: amount,
        reason,
        previousValue: currentValue,
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

    const [existingPos] = await tx.select().from(elementPossessions).where(and(
      eq(elementPossessions.characterId, characterId),
      eq(elementPossessions.elementId, elementId)
    ));

    const currentQty = existingPos ? existingPos.quantity : 0;
    const finalQty = currentQty + quantityChange;

    if (finalQty < 0) {
      throw new Error(`Cannot reduce quantity below zero. Current: ${currentQty}, Change: ${quantityChange}`);
    }

    if (finalQty === 0) {
      if (existingPos) {
        await tx.delete(elementPossessions).where(eq(elementPossessions.id, existingPos.id));
      }
    } else {
      if (existingPos) {
        await tx.update(elementPossessions)
          .set({ quantity: finalQty })
          .where(eq(elementPossessions.id, existingPos.id));
      } else {
        await tx.insert(elementPossessions).values({
          id: nanoid(10),
          characterId,
          elementId,
          quantity: finalQty,
          acquiredAt: new Date()
        });
      }
    }

    await tx.insert(auditLogs).values({
      actorUid: moderatorUid,
      actionType: 'possession_update',
      targetId: characterId.toString(),
      details: {
        elementId,
        change: quantityChange,
        reason,
        previousQuantity: currentQty,
        finalQuantity: finalQty
      }
    });

    return { success: true, finalQuantity: finalQty };
  });
}

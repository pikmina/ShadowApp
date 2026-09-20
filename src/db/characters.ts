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



export async function deleteCharacter(characterId: number, actorUid?: string) {
  await db.transaction(async (tx) => {
    const [char] = await tx.select().from(characters).where(eq(characters.id, characterId));
    await tx.delete(elementPossessions).where(eq(elementPossessions.characterId, characterId));
    await tx.delete(characterEmployments).where(eq(characterEmployments.characterId, characterId));
    await tx.delete(characterEnrollments).where(eq(characterEnrollments.characterId, characterId));
    await tx.delete(characters).where(eq(characters.id, characterId));

    if (actorUid && char) {
      await tx.insert(auditLogs).values({
        actorUid,
        actionType: 'character_deleted',
        targetId: characterId.toString(),
        details: {
          name: char.name,
          exp: char.exp,
          yen: char.yen,
        },
      });
    }
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
  const { getCharacterEmployments } = await import('./employments.ts');
  const { getCharacterEnrollment } = await import('./academicClasses.ts');
  const [possessions, employments, enrollment] = await Promise.all([
    db.select({ possession: elementPossessions, element: systemElements })
      .from(elementPossessions)
      .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
      .where(and(eq(elementPossessions.characterId, id), eq(systemElements.status, 'published'))),
    getCharacterEmployments(id).catch(() => []),
    getCharacterEnrollment(id).catch(() => null),
  ]);
  return { ...character, possessions, employments, enrollment };
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
  characterId?: number | null;
  userId: number;
  name: string;
  profileData: Record<string, any>;
  expectedUpdatedAt?: Date | string;
  canonCharacterId?: string | null;
  elementIds?: string[];
  exp?: number;
  yen?: number;
  inventoryPossessions?: Array<{ elementId: string; quantity: number }>;
  credentialPossessions?: Array<{ elementId: string; quantity?: number }>;
  skillPossessions?: Array<{ elementId: string; quantity: number }>;
  actorUid: string;
}) {
  return db.transaction(async tx => {
    // 1. Process traits & weaknesses (elementIds)
    const traitAndWeaknessIds = data.elementIds !== undefined ? [...new Set(data.elementIds)] : undefined;
    if (traitAndWeaknessIds) {
      const selectedTraits = traitAndWeaknessIds.length
        ? await tx.select().from(systemElements).where(inArray(systemElements.id, traitAndWeaknessIds))
        : [];
      if (selectedTraits.length !== traitAndWeaknessIds.length) throw Object.assign(new Error('One or more selected traits/weaknesses do not exist'), { status: 400 });
      if (selectedTraits.some(element => element.status !== 'published')) throw Object.assign(new Error('Only published elements can be assigned'), { status: 409 });
      if (selectedTraits.some(element => !['trait', 'weakness'].includes(element.kind))) throw Object.assign(new Error('Character sheet selections must be traits or weaknesses'), { status: 400 });

      const possessionContext = new Map(traitAndWeaknessIds.map(id => [id, { quantity: 1, selectedChoices: {} }]));
      for (const element of selectedTraits) {
        const requirements = requirementGroupSchema.parse(element.requirements);
        const result = evaluateRequirements(requirements, { profile: data.profileData, possessions: possessionContext });
        if (!result.passed) throw Object.assign(new Error(`Requirements not met for element ${element.id}: ${result.failures.join(', ')}`), { status: 409 });
      }
    }

    // 2. Process credentials (license, permission, certification)
    let validCredentials: Array<{ elementId: string; quantity: number }> | undefined = undefined;
    if (data.credentialPossessions !== undefined) {
      const credMap = new Map<string, number>();
      for (const item of data.credentialPossessions) {
        if (item.elementId && (item.quantity ?? 1) > 0) {
          credMap.set(item.elementId, 1);
        }
      }
      const credIds = Array.from(credMap.keys());
      if (credIds.length > 0) {
        const selectedCreds = await tx.select().from(systemElements).where(inArray(systemElements.id, credIds));
        if (selectedCreds.length !== credIds.length) throw Object.assign(new Error('One or more selected credentials do not exist'), { status: 400 });
        if (selectedCreds.some(element => element.status !== 'published')) throw Object.assign(new Error('Only published credentials can be assigned'), { status: 409 });
        if (selectedCreds.some(element => !['license', 'permission', 'certification'].includes(element.kind))) {
          throw Object.assign(new Error('Credential selections must be licenses, permissions, or certifications'), { status: 400 });
        }
      }
      validCredentials = credIds.map(elementId => ({ elementId, quantity: 1 }));
    }

    // 3. Process inventory items (equipment, weapons, consumables, resources, etc.)
    let validInventory: Array<{ elementId: string; quantity: number }> | undefined = undefined;
    if (data.inventoryPossessions !== undefined) {
      const invMap = new Map<string, number>();
      for (const item of data.inventoryPossessions) {
        if (item.elementId && item.quantity > 0) {
          invMap.set(item.elementId, (invMap.get(item.elementId) || 0) + item.quantity);
        }
      }
      const invIds = Array.from(invMap.keys());
      if (invIds.length > 0) {
        const selectedInv = await tx.select().from(systemElements).where(inArray(systemElements.id, invIds));
        if (selectedInv.length !== invIds.length) throw Object.assign(new Error('One or more selected inventory items do not exist'), { status: 400 });
        if (selectedInv.some(element => element.status !== 'published')) throw Object.assign(new Error('Only published inventory items can be assigned'), { status: 409 });
        if (selectedInv.some(element => ['trait', 'weakness', 'license', 'permission', 'certification', 'skill'].includes(element.kind))) {
          throw Object.assign(new Error('Inventory items cannot be traits, weaknesses, credentials, or skills'), { status: 400 });
        }
      }
      validInventory = Array.from(invMap.entries()).map(([elementId, quantity]) => ({ elementId, quantity }));
    }

    // 4. Process skills (skill)
    let validSkills: Array<{ elementId: string; quantity: number }> | undefined = undefined;
    if (data.skillPossessions !== undefined) {
      const skillMap = new Map<string, number>();
      for (const item of data.skillPossessions) {
        if (item.elementId && (item.quantity ?? 1) > 0) {
          skillMap.set(item.elementId, Math.max(1, Math.min(10, item.quantity ?? 1)));
        }
      }
      const skillIds = Array.from(skillMap.keys());
      if (skillIds.length > 0) {
        const selectedSkills = await tx.select().from(systemElements).where(inArray(systemElements.id, skillIds));
        if (selectedSkills.length !== skillIds.length) throw Object.assign(new Error('One or more selected skills do not exist'), { status: 400 });
        if (selectedSkills.some(element => element.status !== 'published')) throw Object.assign(new Error('Only published skills can be assigned'), { status: 409 });
        if (selectedSkills.some(element => element.kind !== 'skill')) {
          throw Object.assign(new Error('Skill selections must be skills'), { status: 400 });
        }
      }
      validSkills = Array.from(skillMap.entries()).map(([elementId, quantity]) => ({ elementId, quantity }));
    }

    const { traits: _legacyTraits, weaknesses: _legacyWeaknesses, ...cleanProfileData } = data.profileData;
    const now = new Date();
    let character: typeof characters.$inferSelect;

    const charValues: any = {
      name: data.name,
      profileData: cleanProfileData,
      canonCharacterId: data.canonCharacterId ?? null,
      updatedAt: now,
    };
    if (data.exp !== undefined && data.exp >= 0) charValues.exp = data.exp;
    if (data.yen !== undefined && data.yen >= 0) charValues.yen = data.yen;

    if (data.characterId) {
      const expected = data.expectedUpdatedAt ? new Date(data.expectedUpdatedAt).toISOString() : null;
      const condition = expected
        ? and(eq(characters.id, data.characterId), sql`date_trunc('milliseconds', ${characters.updatedAt}) = date_trunc('milliseconds', ${expected}::timestamptz AT TIME ZONE 'UTC')`)
        : eq(characters.id, data.characterId);
      const [updated] = await tx.update(characters).set(charValues).where(condition).returning();
      if (!updated) {
        const [existing] = await tx.select({ id: characters.id }).from(characters).where(eq(characters.id, data.characterId));
        throw Object.assign(new Error(existing ? 'Conflict' : 'Character not found'), { status: existing ? 409 : 404 });
      }
      character = updated;
    } else {
      [character] = await tx.insert(characters).values({
        userId: data.userId,
        name: data.name,
        profileData: cleanProfileData,
        canonCharacterId: data.canonCharacterId ?? null,
        exp: data.exp ?? 0,
        yen: data.yen ?? 0,
      }).returning();
    }

    // Synchronize Traits & Weaknesses if passed
    if (traitAndWeaknessIds !== undefined) {
      const currentSheetPossessions = await tx.select({ id: elementPossessions.id })
        .from(elementPossessions)
        .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
        .where(and(eq(elementPossessions.characterId, character.id), inArray(systemElements.kind, ['trait', 'weakness'])));
      if (currentSheetPossessions.length) {
        await tx.delete(elementPossessions).where(inArray(elementPossessions.id, currentSheetPossessions.map(item => item.id)));
      }
      for (const elementId of traitAndWeaknessIds) {
        await tx.insert(elementPossessions).values({ id: nanoid(10), characterId: character.id, elementId, quantity: 1 }).onConflictDoNothing();
      }
    }

    // Synchronize Credentials (Licenses, Permissions, Certifications) if passed
    if (validCredentials !== undefined) {
      const currentCredPossessions = await tx.select({ id: elementPossessions.id })
        .from(elementPossessions)
        .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
        .where(and(eq(elementPossessions.characterId, character.id), inArray(systemElements.kind, ['license', 'permission', 'certification'])));
      if (currentCredPossessions.length) {
        await tx.delete(elementPossessions).where(inArray(elementPossessions.id, currentCredPossessions.map(item => item.id)));
      }
      for (const cred of validCredentials) {
        await tx.insert(elementPossessions).values({ id: nanoid(10), characterId: character.id, elementId: cred.elementId, quantity: 1 }).onConflictDoNothing();
      }
    }

    // Synchronize Inventory Items if passed
    if (validInventory !== undefined) {
      const currentAllPossessions = await tx.select({ id: elementPossessions.id, kind: systemElements.kind })
        .from(elementPossessions)
        .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
        .where(eq(elementPossessions.characterId, character.id));
      const currentInvPossessions = currentAllPossessions.filter(item => !['trait', 'weakness', 'license', 'permission', 'certification', 'skill'].includes(item.kind));
      if (currentInvPossessions.length) {
        await tx.delete(elementPossessions).where(inArray(elementPossessions.id, currentInvPossessions.map(item => item.id)));
      }
      for (const inv of validInventory) {
        await tx.insert(elementPossessions).values({ id: nanoid(10), characterId: character.id, elementId: inv.elementId, quantity: inv.quantity }).onConflictDoNothing();
      }
    }

    // Synchronize Skills if passed
    if (validSkills !== undefined) {
      const currentSkillPossessions = await tx.select({ id: elementPossessions.id })
        .from(elementPossessions)
        .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
        .where(and(eq(elementPossessions.characterId, character.id), eq(systemElements.kind, 'skill')));
      if (currentSkillPossessions.length) {
        await tx.delete(elementPossessions).where(inArray(elementPossessions.id, currentSkillPossessions.map(item => item.id)));
      }
      for (const sk of validSkills) {
        await tx.insert(elementPossessions).values({ id: nanoid(10), characterId: character.id, elementId: sk.elementId, quantity: sk.quantity }).onConflictDoNothing();
      }
    }

    await tx.insert(auditLogs).values({
      actorUid: data.actorUid,
      actionType: 'character_elements_sync',
      targetId: String(character.id),
      details: {
        elementIds: traitAndWeaknessIds,
        credentialsCount: validCredentials?.length,
        inventoryCount: validInventory?.length,
        skillsCount: validSkills?.length,
        exp: data.exp,
        yen: data.yen,
      },
    });

    return {
      ...character,
      possessions: await tx.select({ possession: elementPossessions, element: systemElements })
        .from(elementPossessions)
        .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
        .where(eq(elementPossessions.characterId, character.id))
    };
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

      if (element.kind === 'attribute_upgrade') {
        const [maxAttrRule] = await tx.select().from(systemRules).where(eq(systemRules.key, 'max_purchased_attributes'));
        const maxPurchasedAttributes = Number((maxAttrRule?.value as any)?.max ?? maxAttrRule?.value) || 5;

        const existingAttrPossessions = await tx.select({
          elementId: elementPossessions.elementId,
          quantity: elementPossessions.quantity,
        })
        .from(elementPossessions)
        .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
        .where(and(
          eq(elementPossessions.characterId, characterId),
          eq(systemElements.kind, 'attribute_upgrade')
        ));

        const currentTotal = existingAttrPossessions.reduce((sum, p) => sum + p.quantity, 0);
        const newTotal = currentTotal + quantityChange;
        if (newTotal > maxPurchasedAttributes) {
          throw Object.assign(new Error(`Límite de atributos superado: El personaje tendría ${newTotal} mejoras de atributo y el máximo permitido por las reglas del sistema es ${maxPurchasedAttributes}.`), { status: 400 });
        }
      }
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

    if (element.kind === 'attribute_upgrade') {
      const attrId = (element.metadata as any)?.attributeId || 'FUE';
      const currentAttrVal = Number((character.profileData as Record<string, any>)?.[attrId]) || 0;
      const updatedVal = Math.max(0, currentAttrVal + quantityChange);
      await tx.update(characters).set({
        profileData: {
          ...(character.profileData as Record<string, any>),
          [attrId]: updatedVal,
        },
        updatedAt: new Date(),
      }).where(eq(characters.id, characterId));
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

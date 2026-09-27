import { db } from './index.ts';
import { characters, players } from './schema.ts';
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

export async function createCharacter(userId: number | null, name: string, profileData: any, canonCharacterId?: string | null, playerId?: number | null, active: boolean = true) {
  const [created] = await db.insert(characters)
    .values({ userId, name, profileData, canonCharacterId: canonCharacterId || null, playerId: playerId || null, active })
    .returning();
  return created;
}

export async function updateCharacter(characterId: number, data: { name?: string, profileData?: any, expectedUpdatedAt?: Date | string, canonCharacterId?: string | null, playerId?: number | null, active?: boolean }) {
  const updatePayload: any = { updatedAt: new Date() };
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.profileData !== undefined) updatePayload.profileData = data.profileData;
  if (data.canonCharacterId !== undefined) updatePayload.canonCharacterId = data.canonCharacterId;
  if (data.playerId !== undefined) updatePayload.playerId = data.playerId;
  if (data.active !== undefined) updatePayload.active = data.active;

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

import { elementPossessions, auditLogs, systemElements, characterEmployments, characterEnrollments, characterTechniques } from './schema.ts';
import { systemRules } from './schema.ts';
import { sql, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { evaluateRequirements, requirementGroupSchema } from '../domain/requirements.ts';
import { getCharacterTechniquesByCharacterId } from './characterTechniques.ts';

export async function getCharacterTechniques(characterId: number) {
  return getCharacterTechniquesByCharacterId(characterId);
}

export async function getCharacterWithTechniques(characterId: number) {
  const character = await getCharacterById(characterId);
  if (!character) return null;
  const techniques = await getCharacterTechniquesByCharacterId(characterId);
  return { ...character, techniques };
}

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
  const { getCharacterTechniquesByCharacterId } = await import('./characterTechniques.ts');
  const [possessions, employments, enrollment, techniques] = await Promise.all([
    db.select({ possession: elementPossessions, element: systemElements })
      .from(elementPossessions)
      .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
      .where(and(eq(elementPossessions.characterId, id), eq(systemElements.status, 'published'))),
    getCharacterEmployments(id).catch(() => []),
    getCharacterEnrollment(id).catch(() => null),
    getCharacterTechniquesByCharacterId(id).catch(() => []),
  ]);
  return { ...character, possessions, employments, enrollment, techniques };
}

export async function getPublicCharacterByIdOrName(identifier: string) {
  if (!identifier) return null;
  const decoded = decodeURIComponent(identifier).trim();
  
  // 1. Try numeric ID
  const numericId = parseInt(decoded, 10);
  if (!isNaN(numericId) && String(numericId) === decoded) {
    const direct = await getPublicCharacterById(numericId);
    if (direct) return direct;
  }

  // 2. Search all characters by name, canonCharacterId, or alias
  const allCharacters = await db.select().from(characters);
  const normalizedSearch = decoded.toLowerCase().replace(/[^a-z0-9]+/g, '');

  // Exact match
  let matched = allCharacters.find(c => 
    c.name.toLowerCase() === decoded.toLowerCase() || 
    (c.canonCharacterId && c.canonCharacterId.toLowerCase() === decoded.toLowerCase())
  );

  // Normalized alphanumeric match
  if (!matched) {
    matched = allCharacters.find(c => {
      const cNorm = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const canonNorm = (c.canonCharacterId || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      const alias = (c.profileData as any)?.alias || (c.profileData as any)?.hero_name || '';
      const aliasNorm = String(alias).toLowerCase().replace(/[^a-z0-9]+/g, '');
      return cNorm === normalizedSearch || (canonNorm && canonNorm === normalizedSearch) || (aliasNorm && aliasNorm === normalizedSearch);
    });
  }

  // Substring match
  if (!matched) {
    matched = allCharacters.find(c => 
      c.name.toLowerCase().includes(decoded.toLowerCase()) || 
      (c.canonCharacterId && c.canonCharacterId.toLowerCase().includes(decoded.toLowerCase()))
    );
  }

  if (!matched) return null;
  return getPublicCharacterById(matched.id);
}

export async function getCharactersWithPossessions() {
  const allCharacters = await db
    .select({
      character: characters,
      player: {
        id: players.id,
        name: players.name,
        status: players.status,
      }
    })
    .from(characters)
    .leftJoin(players, eq(players.id, characters.playerId));

  const allPossessions = await db.select({ possession: elementPossessions, element: systemElements })
    .from(elementPossessions)
    .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId));

  return allCharacters.map(({ character, player }) => ({
    ...character,
    player: player?.id ? player : null,
    possessions: allPossessions.filter(row => row.possession.characterId === character.id),
  }));
}

export async function saveCharacterWithElementSelections(data: {
  characterId?: number | null;
  userId?: number | null;
  playerId?: number | null;
  active?: boolean;
  name: string;
  profileData: Record<string, any>;
  expectedUpdatedAt?: Date | string;
  canonCharacterId?: string | null;
  elementIds?: string[];
  exp?: number;
  yen?: number;
  inventoryPossessions?: Array<{ elementId: string; quantity: number; equipped?: boolean; notes?: string | null }>;
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

    // 2. Process credentials (license, permission, certification, character_resource, background, clandestine_asset)
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
        if (selectedCreds.some(element => !['license', 'permission', 'certification', 'character_resource', 'background', 'clandestine_asset'].includes(element.kind))) {
          throw Object.assign(new Error('Credential selections must be licenses, permissions, certifications, character resources, backgrounds, or clandestine assets'), { status: 400 });
        }
      }
      validCredentials = credIds.map(elementId => ({ elementId, quantity: 1 }));
    }

    // 3. Process inventory items (equipment, weapon, consumable, ammunition, crafting_material, ingredient, vehicle, real_estate)
    let validInventory: Array<{ elementId: string; quantity: number; equipped?: boolean; notes?: string | null }> | undefined = undefined;
    if (data.inventoryPossessions !== undefined) {
      const invMap = new Map<string, { quantity: number; equipped: boolean; notes?: string | null }>();
      for (const item of data.inventoryPossessions) {
        if (item.elementId && item.quantity > 0) {
          const existing = invMap.get(item.elementId);
          invMap.set(item.elementId, {
            quantity: (existing?.quantity || 0) + item.quantity,
            equipped: item.equipped !== undefined ? item.equipped : (existing?.equipped || false),
            notes: item.notes !== undefined ? item.notes : existing?.notes,
          });
        }
      }
      const invIds = Array.from(invMap.keys());
      if (invIds.length > 0) {
        const selectedInv = await tx.select().from(systemElements).where(inArray(systemElements.id, invIds));
        if (selectedInv.length !== invIds.length) throw Object.assign(new Error('One or more selected inventory items do not exist'), { status: 400 });
        if (selectedInv.some(element => element.status !== 'published')) throw Object.assign(new Error('Only published inventory items can be assigned'), { status: 409 });
        if (selectedInv.some(element => ['trait', 'weakness', 'license', 'permission', 'certification', 'character_resource', 'background', 'clandestine_asset', 'skill'].includes(element.kind))) {
          throw Object.assign(new Error('Inventory items cannot be traits, weaknesses, credentials, resources, backgrounds, clandestine assets, or skills'), { status: 400 });
        }
      }
      validInventory = Array.from(invMap.entries()).map(([elementId, invData]) => ({
        elementId,
        quantity: invData.quantity,
        equipped: invData.equipped,
        notes: invData.notes,
      }));
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

    const { traits: _legacyTraits, weaknesses: _legacyWeaknesses, ...cleanProfileData } = data.profileData || {};
    const now = new Date();
    let character: typeof characters.$inferSelect;

    const charValues: any = {
      name: data.name,
      profileData: cleanProfileData,
      canonCharacterId: data.canonCharacterId ?? null,
      updatedAt: now,
    };
    if (data.playerId !== undefined) charValues.playerId = data.playerId;
    if (data.active !== undefined) charValues.active = data.active;
    if (data.userId !== undefined) charValues.userId = data.userId;
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
        userId: data.userId ?? null,
        playerId: data.playerId ?? null,
        active: data.active ?? true,
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
        await tx.insert(elementPossessions).values({
          id: nanoid(10),
          characterId: character.id,
          elementId: inv.elementId,
          quantity: inv.quantity,
          equipped: inv.equipped ?? false,
          notes: inv.notes ?? null,
        }).onConflictDoNothing();
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

export async function toggleCharacterPossessionEquip(characterId: number, elementId: string, equipped?: boolean, actorUid?: string) {
  return db.transaction(async (tx) => {
    const [pos] = await tx.select()
      .from(elementPossessions)
      .where(and(eq(elementPossessions.characterId, characterId), eq(elementPossessions.elementId, elementId)));
    if (!pos) {
      const err = new Error("Possession not found");
      (err as any).status = 404;
      throw err;
    }
    const nextEquipped = equipped !== undefined ? equipped : !pos.equipped;
    const [updated] = await tx.update(elementPossessions)
      .set({ equipped: nextEquipped })
      .where(eq(elementPossessions.id, pos.id))
      .returning();

    if (actorUid) {
      await tx.insert(auditLogs).values({
        actorUid,
        actionType: nextEquipped ? 'item_equipped' : 'item_unequipped',
        targetId: characterId.toString(),
        details: {
          elementId,
          equipped: nextEquipped,
        }
      });
    }

    return updated;
  });
}


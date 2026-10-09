import { db, ensureSystemSchemaColumns, pool } from './index.ts';
import { characters, players } from './schema.ts';
import { eq, or, and, isNull, sql, inArray } from 'drizzle-orm';

export async function getCharacterByUserId(userId: number) {
  const [character] = await db.select().from(characters).where(eq(characters.userId, userId));
  if (!character) return null;
  return { ...character, possessions: await getCharacterPossessions(character.id) };
}

export async function getCharacterById(id: number) {
  try {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || null;
  } catch {
    try {
      const res = await pool.query(`SELECT * FROM characters WHERE id = $1`, [id]);
      if (!res.rows || res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        canonCharacterId: r.canon_character_id || null,
        playerId: r.player_id || null,
        userId: r.user_id || null,
        profileData: r.profile_data || {},
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    } catch {
      return null;
    }
  }
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
import { nanoid } from 'nanoid';
import { evaluateRequirements, requirementGroupSchema } from '../domain/requirements.ts';
import { getCharacterTechniquesByCharacterId } from './characterTechniques.ts';
import { calculateDerivedStats } from '../lib/characterValidation.ts';

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
  await ensureSystemSchemaColumns();
  try {
    return await db.select({ possession: elementPossessions, element: systemElements })
      .from(elementPossessions)
      .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
      .where(eq(elementPossessions.characterId, characterId));
  } catch (err: any) {
    const isMissingCol = err?.code === '42703' || err?.cause?.code === '42703' || String(err?.message).includes('icon_') || String(err?.cause?.message).includes('icon_');
    if (isMissingCol) {
      const res = await db.execute(sql`
        SELECT ep.id as ep_id, ep.character_id, ep.element_id, ep.quantity, ep.equipped, ep.notes,
               se.id as se_id, se.kind, se.name, se.description, se.status, se.effects, se.mechanical_behaviors, se.requirements, se.metadata, se.revision
        FROM element_possessions ep
        INNER JOIN system_elements se ON se.id = ep.element_id
        WHERE ep.character_id = ${characterId}
      `);
      return (res.rows || []).map((r: any) => ({
        possession: { id: r.ep_id, characterId: r.character_id, elementId: r.element_id, quantity: r.quantity, equipped: r.equipped, notes: r.notes },
        element: { id: r.se_id, kind: r.kind, name: r.name, description: r.description, status: r.status, effects: r.effects, mechanicalBehaviors: r.mechanical_behaviors, requirements: r.requirements, metadata: r.metadata, revision: r.revision, iconType: null, iconValue: null }
      }));
    }
    throw err;
  }
}

export async function getPublicCharacterById(id: number) {
  await ensureSystemSchemaColumns();
  const character = await getCharacterById(id);
  if (!character) return null;
  const { getCharacterEmployments } = await import('./employments.ts');
  const { getCharacterEnrollment } = await import('./academicClasses.ts');
  const { getCharacterTechniquesByCharacterId } = await import('./characterTechniques.ts');

  let possessions: any[] = [];
  try {
    possessions = await db.select({ possession: elementPossessions, element: systemElements })
      .from(elementPossessions)
      .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId))
      .where(and(eq(elementPossessions.characterId, id), eq(systemElements.status, 'published')));
  } catch (err: any) {
    try {
      const res = await pool.query(`
        SELECT ep.id as ep_id, ep.character_id, ep.element_id, ep.quantity, ep.equipped, ep.notes,
               se.*
        FROM element_possessions ep
        INNER JOIN system_elements se ON se.id = ep.element_id
        WHERE ep.character_id = $1 AND se.status = 'published'
      `, [id]);
      possessions = (res.rows || []).map((r: any) => ({
        possession: { id: r.ep_id, characterId: r.character_id, elementId: r.element_id, quantity: r.quantity, equipped: r.equipped, notes: r.notes },
        element: {
          ...r,
          id: r.element_id || r.id,
          kind: r.kind,
          name: r.name,
          description: r.description,
          status: r.status,
          effects: r.effects || [],
          mechanicalBehaviors: r.mechanical_behaviors || [],
          requirements: r.requirements || { operator: 'all', requirements: [] },
          metadata: r.metadata || {},
          revision: r.revision || 1,
          iconType: r.icon_type || null,
          iconValue: r.icon_value || null,
        }
      }));
    } catch (fallbackErr) {
      console.warn("Fallback possessions in getPublicCharacterById error:", fallbackErr);
    }
  }

  const [employments, enrollment, techniques] = await Promise.all([
    getCharacterEmployments(id).catch(() => []),
    getCharacterEnrollment(id).catch(() => null),
    getCharacterTechniquesByCharacterId(id).catch(() => []),
  ]);

  const rawProfile = (character.profileData as Record<string, any>) || {};
  const prof = { ...rawProfile };

  // Calculate / guarantee derived stats and atributos
  const fue = Number(prof.fue ?? prof.FUE ?? prof.atributos?.fue ?? 0);
  const des = Number(prof.des ?? prof.DES ?? prof.atributos?.des ?? 0);
  const res = Number(prof.res ?? prof.RES ?? prof.atributos?.res ?? 0);
  const int = Number(prof.int ?? prof.INT ?? prof.atributos?.int ?? 0);
  const vol = Number(prof.vol ?? prof.VOL ?? prof.atributos?.vol ?? 0);
  const vel = Number(prof.vel ?? prof.VEL ?? prof.atributos?.vel ?? 0);

  if (!prof.atributos) {
    prof.atributos = { fue, des, res, int, vol, vel };
  }

  // Base fallback derived stats
  let salud_maxima = Number(prof.salud_maxima ?? prof.salud ?? prof.maxHealth ?? (20 + res));
  let estamina_maxima = Number(prof.estamina_maxima ?? prof.estamina ?? prof.maxStamina ?? (20 + des));
  let salud_actual = Number(prof.salud_actual ?? salud_maxima);
  let estamina_actual = Number(prof.estamina_actual ?? estamina_maxima);
  let evasion = Number(prof.evasion ?? (10 + vel));
  let coraje = Number(prof.coraje ?? (10 + vol));
  let mod_fue = Number(prof.mod_fue ?? Math.floor(fue / 2));
  let mod_des = Number(prof.mod_des ?? Math.floor(des / 2));
  let iniciativa = Number(prof.iniciativa ?? (Math.floor(int / 2) + Math.floor(vel / 2)));
  let reduccion_dano = Number(prof.reduccion_dano ?? 0);
  let daño_fisico = prof.daño_fisico || (mod_fue > 0 ? `1D8 + ${mod_fue}` : '1D8');
  let daño_rango = prof.daño_rango || (mod_des > 0 ? `1D8 + ${mod_des}` : '1D8');

  // Compute canonical derived stats taking into account stage, elements, traits, and possessions (like attribute_upgrade)
  try {
    const [stagesRule, mechanicsRule, staminaCostsRule] = await Promise.all([
      db.select().from(systemRules).where(eq(systemRules.key, 'system_stages')).then(r => r[0]?.value).catch(() => []),
      db.select().from(systemRules).where(eq(systemRules.key, 'system_mechanics')).then(r => r[0]?.value).catch(() => []),
      db.select().from(systemRules).where(eq(systemRules.key, 'stamina_execution_costs')).then(r => r[0]?.value).catch(() => undefined),
    ]);
    const { getPublishedElements } = await import('./elements.ts');
    const publishedElements = await getPublishedElements().catch(() => []);
    const elementMap = new Map<string, any>();
    publishedElements.forEach(el => elementMap.set(el.id, el));
    possessions.forEach(p => {
      if (p.element && !elementMap.has(p.element.id)) {
        elementMap.set(p.element.id, p.element);
      }
    });
    const combinedElements = Array.from(elementMap.values());

    const sheetRows = possessions.filter((row: any) => ['trait', 'weakness'].includes(row?.element?.kind || row?.kind));
    const relationalTraits = sheetRows.filter((r: any) => (r.element?.kind || r.kind) === 'trait').map((r: any) => r.element?.id || r.possession?.elementId || r.elementId);
    const relationalWeaknesses = sheetRows.filter((r: any) => (r.element?.kind || r.kind) === 'weakness').map((r: any) => r.element?.id || r.possession?.elementId || r.elementId);
    const combinedTraits = Array.from(new Set([
      ...(Array.isArray(prof.traits) ? prof.traits : []),
      ...relationalTraits
    ]));
    const combinedWeaknesses = Array.from(new Set([
      ...(Array.isArray(prof.weaknesses) ? prof.weaknesses : []),
      ...relationalWeaknesses
    ]));
    const completeProfile = { ...prof, traits: combinedTraits, weaknesses: combinedWeaknesses };

    const stagesList = Array.isArray(stagesRule) ? stagesRule : [];
    const mechanicsList = Array.isArray(mechanicsRule) ? (mechanicsRule as any) : [];
    const derived = calculateDerivedStats(completeProfile, stagesList, combinedElements, mechanicsList, possessions);
    if (derived) {
      salud_maxima = derived.salud;
      estamina_maxima = derived.estamina;
      salud_actual = Number(prof.salud_actual ?? salud_maxima);
      estamina_actual = Number(prof.estamina_actual ?? estamina_maxima);
      evasion = derived.evasion;
      coraje = derived.coraje;
      mod_fue = derived.modFue;
      mod_des = derived.modDes;
      iniciativa = derived.iniciativa;
      reduccion_dano = derived.reduccionDano;
      daño_fisico = derived.dañoFisico || daño_fisico;
      daño_rango = derived.dañoRango || daño_rango;
    }
  } catch (derivedErr) {
    console.warn("Could not calculate dynamic derived stats for character", id, derivedErr);
  }

  prof.salud_maxima = salud_maxima;
  prof.salud_actual = salud_actual;
  prof.estamina_maxima = estamina_maxima;
  prof.estamina_actual = estamina_actual;
  prof.evasion = evasion;
  prof.coraje = coraje;
  prof.mod_fue = mod_fue;
  prof.mod_des = mod_des;
  prof.iniciativa = iniciativa;
  prof.reduccion_dano = reduccion_dano;
  prof.daño_fisico = daño_fisico;
  prof.daño_rango = daño_rango;

  const stats = {
    salud_maxima,
    salud_actual,
    estamina_maxima,
    estamina_actual,
    evasion,
    coraje,
    mod_fue,
    mod_des,
    iniciativa,
    daño_fisico,
    daño_rango,
    reduccion_dano,
  };

  let enrichedTechniques = techniques;
  try {
    const { calculateTechniqueStructuralCost } = await import('../domain/systemMechanics.ts');
    const { deriveTechniqueLevelFromCost } = await import('../domain/characterTechnique.ts');
    const { generateAutoDescription } = await import('../domain/mechanicalDescription.ts');
    const [mechanicsRule, staminaCostsRule] = await Promise.all([
      db.select().from(systemRules).where(eq(systemRules.key, 'system_mechanics')).then(r => r[0]?.value).catch(() => []),
      db.select().from(systemRules).where(eq(systemRules.key, 'stamina_execution_costs')).then(r => r[0]?.value).catch(() => undefined),
    ]);
    const mechanicsList = Array.isArray(mechanicsRule) ? (mechanicsRule as any) : [];
    enrichedTechniques = (techniques || []).map((tech: any) => {
      const isStructural = Array.isArray(tech?.mechanicalBehaviors) && tech.mechanicalBehaviors.length > 0;
      const structuralCost = calculateTechniqueStructuralCost(tech, mechanicsList, staminaCostsRule);
      const finalCost = isStructural ? structuralCost : (tech.cost ?? structuralCost);
      const derivedLevel = isStructural ? deriveTechniqueLevelFromCost(finalCost).level : (tech.level || 1);
      const autoDesc = isStructural
        ? generateAutoDescription({ ...tech, cost: `${finalCost} CE` }, mechanicsList, staminaCostsRule, finalCost)
        : (tech.autoDescription || generateAutoDescription(tech, mechanicsList, staminaCostsRule, finalCost));
      return {
        ...tech,
        level: derivedLevel,
        cost: finalCost,
        staminaCost: finalCost,
        ce: finalCost,
        autoDescription: autoDesc,
        mechanicalDescription: autoDesc,
      };
    });
  } catch (techErr) {
    console.warn("Could not calculate technique costs for character", id, techErr);
  }

  return {
    ...character,
    profileData: prof,
    stats,
    possessions,
    employments,
    enrollment,
    techniques: enrichedTechniques,
  };
}

export async function getPublicCharacterByIdOrName(identifier: string) {
  if (!identifier) return null;
  // Clean raw identifier: strip URI encoding, leading slashes or backslashes, extra whitespace
  const decoded = decodeURIComponent(identifier).replace(/^[\\/@#\s]+/, '').trim();
  if (!decoded) return null;
  
  // 1. Try numeric ID
  const numericId = parseInt(decoded, 10);
  if (!isNaN(numericId) && String(numericId) === decoded) {
    const direct = await getPublicCharacterById(numericId);
    if (direct) return direct;
  }

  // Helpers for normalization & tokens
  const normalize = (str: string) => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip accents/diacritics
      .toLowerCase()
      .trim();
  };

  const toAlphaNumeric = (str: string) => normalize(str).replace(/[^a-z0-9]+/g, '');

  const getTokens = (str: string) => {
    return normalize(str)
      .split(/[^a-z0-9]+/)
      .filter(t => t.length > 0);
  };

  const searchNorm = normalize(decoded);
  const searchAlpha = toAlphaNumeric(decoded);
  const searchTokens = getTokens(decoded);

  // 2. Load characters
  let allCharacters: any[] = [];
  try {
    allCharacters = await db.select().from(characters);
  } catch {
    try {
      const res = await pool.query(`SELECT * FROM characters`);
      allCharacters = (res.rows || []).map((r: any) => ({
        ...r,
        canonCharacterId: r.canon_character_id || null,
        playerId: r.player_id || null,
        userId: r.user_id || null,
        profileData: r.profile_data || {},
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      allCharacters = [];
    }
  }

  // Build candidate profile info extractor
  const getCharVariations = (c: any) => {
    const prof = (c.profileData as any) || {};
    const basicName = String(prof.basic_name || prof.name || prof.nombre || c.name || '').trim();
    const lastName = String(prof.last_name || prof.apellido || '').trim();
    const directName = String(c.name || '').trim();
    const alias = String(prof.alias || prof.hero_name || prof.apodo || '').trim();
    const canonId = String(c.canonCharacterId || '').trim();

    const firstLast = `${basicName} ${lastName}`.trim();
    const lastFirst = `${lastName} ${basicName}`.trim();
    const directFirstLast = `${directName} ${lastName}`.trim();
    const directLastFirst = `${lastName} ${directName}`.trim();

    // Reversed words from direct name (e.g., "Izuku Midoriya" -> "Midoriya Izuku")
    const wordsInDirect = directName.split(/\s+/).filter(Boolean);
    const reversedDirect = wordsInDirect.length > 1 ? [...wordsInDirect].reverse().join(' ') : '';

    const allStrings = [
      directName,
      reversedDirect,
      firstLast,
      lastFirst,
      directFirstLast,
      directLastFirst,
      basicName,
      lastName,
      alias,
      canonId,
    ].filter(Boolean);

    const tokenSet = new Set<string>();
    for (const s of allStrings) {
      for (const t of getTokens(s)) {
        tokenSet.add(t);
      }
    }

    return {
      allStrings,
      allNormStrings: allStrings.map(normalize),
      allAlphaStrings: allStrings.map(toAlphaNumeric),
      tokenSet,
      basicName,
      lastName,
      directName,
      alias,
      canonId,
    };
  };

  // Step A: Exact matches (case/accent-insensitive)
  let matched = allCharacters.find(c => {
    const v = getCharVariations(c);
    return v.allNormStrings.some(s => s === searchNorm);
  });

  // Step B: Normalized alphanumeric match (ignores spaces/symbols, e.g. "izukumidoriya")
  if (!matched && searchAlpha) {
    matched = allCharacters.find(c => {
      const v = getCharVariations(c);
      return v.allAlphaStrings.some(s => s === searchAlpha);
    });
  }

  // Step C: Token-set match (if query has multiple words, all query words must match character tokens)
  if (!matched && searchTokens.length >= 2) {
    matched = allCharacters.find(c => {
      const v = getCharVariations(c);
      return searchTokens.every(st => v.tokenSet.has(st));
    });
  }

  // Step D: Single token match (if search is a single word >= 3 chars, e.g. "Midoriya" or "Izuku")
  if (!matched && searchTokens.length === 1 && searchTokens[0].length >= 3) {
    const singleToken = searchTokens[0];
    matched = allCharacters.find(c => {
      const v = getCharVariations(c);
      return v.tokenSet.has(singleToken);
    });
  }

  // Step E: Substring match as fallback
  if (!matched && searchNorm.length >= 3) {
    matched = allCharacters.find(c => {
      const v = getCharVariations(c);
      return v.allNormStrings.some(s => s.includes(searchNorm) || (s.length >= 3 && searchNorm.includes(s)));
    });
  }

  // 3. Canon characters check
  if (!matched) {
    let allCanons: any[] = [];
    try {
      const { canonCharacters } = await import('./schema.ts');
      allCanons = await db.select().from(canonCharacters);
    } catch {
      try {
        const res = await pool.query(`SELECT * FROM canon_characters`);
        allCanons = (res.rows || []).map((r: any) => ({
          ...r,
          firstName: r.first_name,
          lastName: r.last_name,
          profileData: r.profile_data || {},
        }));
      } catch {
        allCanons = [];
      }
    }

    const getCanonVariations = (cc: any) => {
      const first = String(cc.firstName || '').trim();
      const last = String(cc.lastName || '').trim();
      const direct = String(cc.name || '').trim();
      const id = String(cc.id || '').trim();
      const aliases = Array.isArray(cc.aliases) ? cc.aliases.map(String) : [];

      const firstLast = `${first} ${last}`.trim();
      const lastFirst = `${last} ${first}`.trim();
      const directWords = direct.split(/\s+/).filter(Boolean);
      const reversedDirect = directWords.length > 1 ? [...directWords].reverse().join(' ') : '';

      const allStrings = [
        id,
        direct,
        reversedDirect,
        firstLast,
        lastFirst,
        first,
        last,
        ...aliases,
      ].filter(Boolean);

      const tokenSet = new Set<string>();
      for (const s of allStrings) {
        for (const t of getTokens(s)) {
          tokenSet.add(t);
        }
      }

      return {
        allStrings,
        allNormStrings: allStrings.map(normalize),
        allAlphaStrings: allStrings.map(toAlphaNumeric),
        tokenSet,
      };
    };

    const matchedCanon = allCanons.find(cc => {
      const v = getCanonVariations(cc);
      // Exact or alphanumeric
      if (v.allNormStrings.some(s => s === searchNorm)) return true;
      if (searchAlpha && v.allAlphaStrings.some(s => s === searchAlpha)) return true;
      // All tokens match
      if (searchTokens.length >= 2 && searchTokens.every(st => v.tokenSet.has(st))) return true;
      // Single token
      if (searchTokens.length === 1 && searchTokens[0].length >= 3 && v.tokenSet.has(searchTokens[0])) return true;
      // Substring
      if (searchNorm.length >= 3 && v.allNormStrings.some(s => s.includes(searchNorm) || (s.length >= 3 && searchNorm.includes(s)))) return true;
      return false;
    });

    if (matchedCanon) {
      const linked = allCharacters.find(c => c.canonCharacterId === matchedCanon.id);
      if (linked) {
        matched = linked;
      } else {
        // Canon character has no linked player character yet:
        // Construct canonical public sheet so it can be viewed rather than returning 404
        const { getOwnerEmployments } = await import('./employments.ts');
        const { getOwnerEnrollment } = await import('./academicClasses.ts');
        const [employments, enrollment] = await Promise.all([
          getOwnerEmployments({ canonCharacterId: matchedCanon.id }).catch(() => []),
          getOwnerEnrollment({ canonCharacterId: matchedCanon.id }).catch(() => null),
        ]);
        const canonProf: Record<string, any> = {
          ...(matchedCanon.profileData || {}),
          basic_name: matchedCanon.firstName || matchedCanon.name,
          last_name: matchedCanon.lastName || '',
          summary: matchedCanon.summary,
          biography: matchedCanon.summary,
          alias: Array.isArray(matchedCanon.aliases) ? matchedCanon.aliases.join(', ') : '',
        };

        const cFue = Number(canonProf.fue ?? canonProf.FUE ?? canonProf.atributos?.fue ?? 5);
        const cDes = Number(canonProf.des ?? canonProf.DES ?? canonProf.atributos?.des ?? 5);
        const cRes = Number(canonProf.res ?? canonProf.RES ?? canonProf.atributos?.res ?? 5);
        const cInt = Number(canonProf.int ?? canonProf.INT ?? canonProf.atributos?.int ?? 5);
        const cVol = Number(canonProf.vol ?? canonProf.VOL ?? canonProf.atributos?.vol ?? 5);
        const cVel = Number(canonProf.vel ?? canonProf.VEL ?? canonProf.atributos?.vel ?? 5);

        if (!canonProf.atributos) {
          canonProf.atributos = { fue: cFue, des: cDes, res: cRes, int: cInt, vol: cVol, vel: cVel };
        }

        const cSaludMax = Number(canonProf.salud_maxima ?? canonProf.salud ?? (20 + cRes));
        const cEstaminaMax = Number(canonProf.estamina_maxima ?? canonProf.estamina ?? (20 + cDes));
        canonProf.salud_maxima = cSaludMax;
        canonProf.salud_actual = cSaludMax;
        canonProf.estamina_maxima = cEstaminaMax;
        canonProf.estamina_actual = cEstaminaMax;
        canonProf.evasion = Number(canonProf.evasion ?? (10 + cVel));
        canonProf.coraje = Number(canonProf.coraje ?? (10 + cVol));
        canonProf.mod_fue = Math.floor(cFue / 2);
        canonProf.mod_des = Math.floor(cDes / 2);
        canonProf.iniciativa = Math.floor(cInt / 2) + Math.floor(cVel / 2);
        canonProf.daño_fisico = canonProf.daño_fisico || '1D8 + 2';
        canonProf.daño_rango = canonProf.daño_rango || '1D8 + 2';
        canonProf.reduccion_dano = canonProf.reduccion_dano || 0;

        const canonStats = {
          salud_maxima: cSaludMax,
          salud_actual: cSaludMax,
          estamina_maxima: cEstaminaMax,
          estamina_actual: cEstaminaMax,
          evasion: canonProf.evasion,
          coraje: canonProf.coraje,
          mod_fue: canonProf.mod_fue,
          mod_des: canonProf.mod_des,
          iniciativa: canonProf.iniciativa,
          daño_fisico: canonProf.daño_fisico,
          daño_rango: canonProf.daño_rango,
          reduccion_dano: canonProf.reduccion_dano,
        };

        return {
          id: matchedCanon.id,
          name: matchedCanon.name,
          canonCharacterId: matchedCanon.id,
          exp: 0,
          yen: 0,
          plus_ultra: 0,
          profileData: canonProf,
          stats: canonStats,
          active: matchedCanon.active,
          isCanon: true,
          possessions: [],
          employments,
          enrollment,
          techniques: [],
        };
      }
    }
  }

  if (!matched) return null;
  return getPublicCharacterById(matched.id);
}

export async function getPublicCharacters() {
  await ensureSystemSchemaColumns();
  try {
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
      .leftJoin(players, eq(players.id, characters.playerId))
      .where(or(eq(characters.active, true), isNull(characters.active)));

    return allCharacters.map(({ character, player }) => ({
      id: character.id,
      name: character.name,
      canonCharacterId: character.canonCharacterId,
      exp: character.exp,
      yen: character.yen,
      active: character.active ?? true,
      profileData: (character.profileData as any) || {},
      player: player?.id ? player : null,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    }));
  } catch (err: any) {
    console.warn("getPublicCharacters standard query failed, using direct characters query fallback:", err?.message || err);
    try {
      const res = await pool.query(`SELECT * FROM characters`);
      return (res.rows || [])
        .filter((r: any) => r.active !== false)
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          canonCharacterId: r.canon_character_id || null,
          exp: r.exp ?? 0,
          yen: r.yen ?? 0,
          active: r.active ?? true,
          profileData: r.profile_data || {},
          player: null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
    } catch (fallbackErr) {
      console.error("Fallback query in getPublicCharacters failed:", fallbackErr);
      return [];
    }
  }
}

export async function getCharactersWithPossessions() {
  await ensureSystemSchemaColumns();
  let allCharacters: any[] = [];
  try {
    allCharacters = await db
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
  } catch (charErr) {
    console.warn("getCharactersWithPossessions characters query failed, using direct query:", charErr);
    try {
      const res = await pool.query(`SELECT * FROM characters`);
      allCharacters = (res.rows || []).map((r: any) => ({
        character: {
          ...r,
          canonCharacterId: r.canon_character_id,
          playerId: r.player_id,
          userId: r.user_id,
          profileData: r.profile_data || {},
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        },
        player: null
      }));
    } catch {
      allCharacters = [];
    }
  }

  let allPossessions: any[] = [];
  try {
    allPossessions = await db.select({ possession: elementPossessions, element: systemElements })
      .from(elementPossessions)
      .innerJoin(systemElements, eq(systemElements.id, elementPossessions.elementId));
  } catch (err: any) {
    try {
      const res = await pool.query(`
        SELECT ep.id as ep_id, ep.character_id, ep.element_id, ep.quantity, ep.equipped, ep.notes,
               se.*
        FROM element_possessions ep
        INNER JOIN system_elements se ON se.id = ep.element_id
      `);
      allPossessions = (res.rows || []).map((r: any) => ({
        possession: { id: r.ep_id, characterId: r.character_id, elementId: r.element_id, quantity: r.quantity, equipped: r.equipped, notes: r.notes },
        element: {
          ...r,
          id: r.element_id || r.id,
          kind: r.kind,
          name: r.name,
          description: r.description,
          status: r.status,
          effects: r.effects || [],
          mechanicalBehaviors: r.mechanical_behaviors || [],
          requirements: r.requirements || { operator: 'all', requirements: [] },
          metadata: r.metadata || {},
          revision: r.revision || 1,
          iconType: r.icon_type || null,
          iconValue: r.icon_value || null,
        }
      }));
    } catch (fallbackErr) {
      console.warn("Fallback possessions in getCharactersWithPossessions error:", fallbackErr);
    }
  }

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
      const currentInvPossessions = currentAllPossessions.filter(item => !['trait', 'weakness', 'license', 'permission', 'certification', 'skill', 'attribute_upgrade', 'character_resource', 'background', 'clandestine_asset'].includes(item.kind));
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


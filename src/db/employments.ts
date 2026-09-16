import { eq, or, and, isNull, isNotNull, asc, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { institutions, departments, positions, characterEmployments, employmentPayments, characters, canonCharacters, elementPossessions, systemRules, systemElements, auditLogs } from './schema.ts';
import { nanoid } from 'nanoid';
import { alias } from 'drizzle-orm/pg-core';
import { evaluateRequirements, requirementGroupSchema } from '../domain/requirements.ts';
import { calculateEmploymentCompensation, employmentCompensationSchema, positionEmploymentRulesSchema } from '../domain/employmentCompensation.ts';

export type EmploymentOwner = { characterId?: number; canonCharacterId?: string };

async function resolveEmploymentOwner(tx: any, owner: EmploymentOwner) {
  if (Number(owner.characterId !== undefined) + Number(owner.canonCharacterId !== undefined) !== 1) {
    throw Object.assign(new Error('Exactly one employment owner is required'), { status: 400 });
  }
  if (owner.canonCharacterId) {
    const [canon] = await tx.select().from(canonCharacters).where(eq(canonCharacters.id, owner.canonCharacterId));
    if (!canon) throw Object.assign(new Error('Canon character not found'), { status: 404 });
    const [linkedCharacter] = await tx.select().from(characters).where(eq(characters.canonCharacterId, canon.id));
    return { characterId: null, canonCharacterId: canon.id, subjectCharacter: linkedCharacter ?? null };
  }
  const [character] = await tx.select().from(characters).where(eq(characters.id, owner.characterId));
  if (!character) throw Object.assign(new Error('Character not found'), { status: 404 });
  return character.canonCharacterId
    ? { characterId: null, canonCharacterId: character.canonCharacterId, subjectCharacter: character }
    : { characterId: character.id, canonCharacterId: null, subjectCharacter: character };
}

async function validatePositionRules(tx: any, data: any, existing?: any) {
  const parsed = positionEmploymentRulesSchema.parse(data);
  const levelId = parsed.levelId !== undefined ? parsed.levelId : existing?.levelId ?? null;
  const riskId = parsed.riskId !== undefined ? parsed.riskId : existing?.riskId ?? null;
  const requirements = requirementGroupSchema.parse(parsed.requirements ?? existing?.requirements ?? { operator: 'all', requirements: [] });
  const optionalBonuses = parsed.optionalBonuses ?? existing?.optionalBonuses ?? [];
  if (levelId || riskId) {
    const [stored] = await tx.select().from(systemRules).where(eq(systemRules.key, 'employment_compensation'));
    const config = employmentCompensationSchema.parse(stored?.value);
    if (levelId && !config.levels.some(entry => entry.id === levelId)) throw Object.assign(new Error('Unknown employment level'), { status: 400 });
    if (riskId && !config.risks.some(entry => entry.id === riskId)) throw Object.assign(new Error('Unknown employment risk'), { status: 400 });
  }
  const flatten = (group: any): any[] => group.requirements.flatMap((entry: any) => entry.operator ? flatten(entry) : [entry]);
  const allRequirements = [...flatten(requirements), ...optionalBonuses.flatMap((bonus: any) => flatten(bonus.requirements))];
  const [catalog, rules] = await Promise.all([tx.select().from(systemElements), tx.select().from(systemRules)]);
  const attributes = rules.find((rule: any) => rule.key === 'system_attributes')?.value;
  const stages = rules.find((rule: any) => rule.key === 'system_stages')?.value;
  for (const requirement of allRequirements) {
    if (requirement.type === 'owns_element' || requirement.type === 'skill_level') {
      const elementId = requirement.type === 'owns_element' ? requirement.elementId : requirement.skillElementId;
      const element = catalog.find((item: any) => item.id === elementId);
      if (!element || element.status !== 'published' || requirement.type === 'skill_level' && element.kind !== 'skill') {
        throw Object.assign(new Error(`Invalid employment requirement element: ${elementId}`), { status: 400 });
      }
    }
    if (requirement.type === 'attribute' && Array.isArray(attributes) && !attributes.some((item: any) => [item.id, item.abbrev].includes(requirement.attributeId))) {
      throw Object.assign(new Error(`Invalid employment attribute: ${requirement.attributeId}`), { status: 400 });
    }
    if (requirement.type === 'stage' && Array.isArray(stages) && !stages.some((item: any) => [item.id, item.name].includes(requirement.stageId))) {
      throw Object.assign(new Error(`Invalid employment stage: ${requirement.stageId}`), { status: 400 });
    }
  }
  return { ...parsed, levelId, riskId, requirements, optionalBonuses };
}

// --- Institutions ---
export async function getInstitutionsWithDepartmentsAndPositions() {
  const allInstitutions = await db.select().from(institutions).orderBy(asc(institutions.sortOrder), asc(institutions.name));
  const allDepartments = await db.select().from(departments).orderBy(asc(departments.sortOrder), asc(departments.name));
  const allPositions = await db.select().from(positions).orderBy(asc(positions.sortOrder), asc(positions.name));

  const [activeEmployments, allCharacters, allCanonCharacters] = await Promise.all([
    db.select().from(characterEmployments).where(eq(characterEmployments.status, 'active')),
    db.select().from(characters),
    db.select().from(canonCharacters),
  ]);

  const occupantsByPosition: Record<string, number> = {};
  activeEmployments.forEach(emp => {
    occupantsByPosition[emp.positionId] = (occupantsByPosition[emp.positionId] || 0) + 1;
  });

  return allInstitutions.map(inst => {
    const instDeps = allDepartments.filter(d => d.institutionId === inst.id);
    return {
      ...inst,
      departments: instDeps.map(dep => {
        const depPos = allPositions.filter(p => p.departmentId === dep.id);
        return {
          ...dep,
          positions: depPos.map(pos => ({
            ...pos,
            occupiedSlots: occupantsByPosition[pos.id] || 0,
            occupants: activeEmployments
              .filter(employment => employment.positionId === pos.id)
              .map(employment => {
                const directCharacter = employment.characterId ? allCharacters.find(item => item.id === employment.characterId) : null;
                const canonId = employment.canonCharacterId ?? directCharacter?.canonCharacterId;
                const character = directCharacter ?? (canonId ? allCharacters.find(item => item.canonCharacterId === canonId) : null);
                const canon = canonId ? allCanonCharacters.find(item => item.id === canonId) : null;
                return {
                  employmentId: employment.id,
                  characterId: character?.id ?? null,
                  canonCharacterId: canon?.id ?? null,
                  name: canon?.name ?? character?.name ?? 'Personaje no disponible',
                  requirementsVerified: employment.requirementsVerified,
                };
              }),
          }))
        };
      })
    };
  });
}

export async function createInstitution(data: { name: string; description?: string; active?: boolean; sortOrder?: number }) {
  const id = nanoid(10);
  const [created] = await db.insert(institutions).values({
    id,
    name: data.name,
    description: data.description || null,
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
  }).returning();
  return created;
}

export async function updateInstitution(id: string, data: Partial<typeof institutions.$inferInsert>) {
  const [updated] = await db.update(institutions).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(institutions.id, id)).returning();
  return updated;
}

export async function deleteInstitution(id: string) {
  // Rely on restrict constraint or check manually
  const deps = await db.select().from(departments).where(eq(departments.institutionId, id)).limit(1);
  if (deps.length > 0) throw new Error("Cannot delete institution with departments.");
  await db.delete(institutions).where(eq(institutions.id, id));
}

// --- Departments ---
export async function createDepartment(data: { institutionId: string; name: string; description?: string; active?: boolean; sortOrder?: number }) {
  const id = nanoid(10);
  const [created] = await db.insert(departments).values({
    id,
    institutionId: data.institutionId,
    name: data.name,
    description: data.description || null,
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
  }).returning();
  return created;
}

export async function updateDepartment(id: string, data: Partial<typeof departments.$inferInsert>) {
  const [updated] = await db.update(departments).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(departments.id, id)).returning();
  return updated;
}

export async function deleteDepartment(id: string) {
  const pos = await db.select().from(positions).where(eq(positions.departmentId, id)).limit(1);
  if (pos.length > 0) throw new Error("Cannot delete department with positions.");
  await db.delete(departments).where(eq(departments.id, id));
}

// --- Positions ---
export async function createPosition(data: any) {
  return db.transaction(async tx => {
    const rules = await validatePositionRules(tx, data);
    const [created] = await tx.insert(positions).values({
      id: nanoid(10), departmentId: data.departmentId, name: data.name,
      description: data.description ?? null, capacity: data.capacity,
      active: data.active ?? true, sortOrder: data.sortOrder ?? 0, ...rules,
    }).returning();
    return created;
  });
}

export async function updatePosition(id: string, data: Partial<typeof positions.$inferInsert>) {
  return db.transaction(async tx => {
    const [existing] = await tx.select().from(positions).where(eq(positions.id, id));
    if (!existing) throw Object.assign(new Error('Position not found'), { status: 404 });
    const rules = await validatePositionRules(tx, data, existing);
    const [updated] = await tx.update(positions).set({ ...data, ...rules, updatedAt: new Date() }).where(eq(positions.id, id)).returning();
    return updated;
  });
}

export async function deletePosition(id: string) {
  const emps = await db.select().from(characterEmployments).where(eq(characterEmployments.positionId, id)).limit(1);
  if (emps.length > 0) throw new Error("Cannot delete position with assigned characters.");
  await db.delete(positions).where(eq(positions.id, id));
}

// --- Employments ---
export async function assignEmployment(owner: EmploymentOwner, positionId: string) {
  return await db.transaction(async (tx) => {
    const resolved = await resolveEmploymentOwner(tx, owner);
    const { subjectCharacter, ...employmentOwner } = resolved;

    // Check position
    const [pos] = await tx.select().from(positions).where(eq(positions.id, positionId));
    if (!pos) throw new Error("Position not found");
    if (!pos.active) throw new Error("Position is inactive");

    let requirementsVerified = false;
    const requirements = requirementGroupSchema.parse(pos.requirements);
    if (subjectCharacter) {
      const owned = await tx.select().from(elementPossessions).where(eq(elementPossessions.characterId, subjectCharacter.id));
      const possessions = new Map(owned.map((item: any) => [item.elementId, { quantity: item.quantity, selectedChoices: item.selectedChoices as Record<string, unknown> }]));
      const [stagesRule] = await tx.select().from(systemRules).where(eq(systemRules.key, 'system_stages'));
      const stageIds = Array.isArray(stagesRule?.value) ? (stagesRule.value as any[]).map(stage => String(stage.id ?? stage.name)) : [];
      const evaluation = evaluateRequirements(requirements, { profile: (subjectCharacter.profileData ?? {}) as Record<string, unknown>, possessions, stageIds });
      if (!evaluation.passed) throw Object.assign(new Error(`Employment requirements not met: ${evaluation.failures.join(', ')}`), { status: 409 });
      requirementsVerified = true;
    }

    // Check duplicate active
    const ownerCondition = resolved.canonCharacterId
      ? eq(characterEmployments.canonCharacterId, resolved.canonCharacterId)
      : eq(characterEmployments.characterId, resolved.characterId!);
    const [existing] = await tx.select().from(characterEmployments).where(and(
      ownerCondition,
      eq(characterEmployments.positionId, positionId),
      eq(characterEmployments.status, 'active')
    ));
    if (existing) {
      const error = new Error("Character already holds this position actively");
      (error as any).status = 409;
      throw error;
    }

    // Check capacity
    if (pos.capacity !== null) {
      if (pos.capacity === 0) {
        const error = new Error("Position does not accept any occupants");
        (error as any).status = 409;
        throw error;
      }
      const activeCount = await tx.select({ count: sql<number>`count(*)` }).from(characterEmployments).where(and(
        eq(characterEmployments.positionId, positionId),
        eq(characterEmployments.status, 'active')
      ));
      if (Number(activeCount[0].count) >= pos.capacity) {
        const error = new Error("Position capacity reached");
        (error as any).status = 409;
        throw error;
      }
    }

    const [created] = await tx.insert(characterEmployments).values({
      id: nanoid(10),
      ...employmentOwner,
      positionId,
      status: 'active',
      startedAt: new Date(),
      requirementsVerified,
    }).returning();
    return created;
  });
}

export const assignCharacterEmployment = (characterId: number, positionId: string) => assignEmployment({ characterId }, positionId);
export const assignCanonEmployment = (canonCharacterId: string, positionId: string) => assignEmployment({ canonCharacterId }, positionId);

export async function removeCharacterEmployment(id: string) {
  // Instead of deleting, we can set status to inactive, but prompt says "retirar un empleo".
  // Wait, "retirar un empleo" -> we can just delete it or mark inactive. We will delete it to keep it clean, or mark inactive. Let's delete it.
  const [deleted] = await db.delete(characterEmployments).where(eq(characterEmployments.id, id)).returning();
  if (!deleted) {
    const error = new Error("Employment not found");
    (error as any).status = 404;
    throw error;
  }
  return deleted;
}

export async function getCharacterEmployments(characterId: number) {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
  if (!character) return [];
  return getOwnerEmployments(character.canonCharacterId ? { canonCharacterId: character.canonCharacterId } : { characterId });
}

export type EmploymentPaymentItem = {
  employmentId: string;
  postsObserved: number;
  minimumPostsApproved: boolean;
  optionalBonusIds?: string[];
};

export async function payEmploymentBatch(moderatorUid: string, periodLabel: string, notes: string | null, items: EmploymentPaymentItem[]) {
  const normalizedPeriod = periodLabel.trim();
  if (!normalizedPeriod) throw Object.assign(new Error('Payment period is required'), { status: 400 });
  if (items.length === 0 || new Set(items.map(item => item.employmentId)).size !== items.length) {
    throw Object.assign(new Error('Select at least one unique employment'), { status: 400 });
  }

  return db.transaction(async tx => {
    const [compensationRule] = await tx.select().from(systemRules).where(eq(systemRules.key, 'employment_compensation'));
    const compensation = employmentCompensationSchema.parse(compensationRule?.value);
    const batchId = nanoid(12);
    const results: any[] = [];

    for (const item of items) {
      if (!Number.isSafeInteger(item.postsObserved) || item.postsObserved < 0) throw Object.assign(new Error('Observed posts must be a non-negative integer'), { status: 400 });
      const [row] = await tx.select({ employment: characterEmployments, position: positions })
        .from(characterEmployments)
        .innerJoin(positions, eq(positions.id, characterEmployments.positionId))
        .where(and(eq(characterEmployments.id, item.employmentId), eq(characterEmployments.status, 'active')));
      if (!row) throw Object.assign(new Error('Active employment not found'), { status: 404 });
      if (!row.position.levelId || !row.position.riskId) throw Object.assign(new Error(`Position ${row.position.name} has no complete compensation configuration`), { status: 409 });
      if (!item.minimumPostsApproved) throw Object.assign(new Error(`Minimum posts were not approved for ${row.position.name}`), { status: 409 });
      if (row.position.minPosts !== null && item.postsObserved < row.position.minPosts) {
        throw Object.assign(new Error(`Minimum posts not met for ${row.position.name}`), { status: 409 });
      }
      const [alreadyPaid] = await tx.select({ id: employmentPayments.id }).from(employmentPayments).where(and(
        eq(employmentPayments.employmentId, item.employmentId), eq(employmentPayments.periodLabel, normalizedPeriod),
      ));
      if (alreadyPaid) throw Object.assign(new Error(`${row.position.name} was already paid for ${normalizedPeriod}`), { status: 409 });

      const [character] = row.employment.characterId
        ? await tx.select().from(characters).where(eq(characters.id, row.employment.characterId))
        : await tx.select().from(characters).where(eq(characters.canonCharacterId, row.employment.canonCharacterId!));
      if (!character) throw Object.assign(new Error(`The holder of ${row.position.name} needs a linked character sheet before payment`), { status: 409 });

      const optionalBonuses = Array.isArray(row.position.optionalBonuses) ? row.position.optionalBonuses as any[] : [];
      const selectedIds = [...new Set(item.optionalBonusIds ?? [])];
      const selectedBonuses = selectedIds.map(id => optionalBonuses.find(bonus => bonus.id === id));
      if (selectedBonuses.some(bonus => !bonus)) throw Object.assign(new Error('Unknown optional employment bonus'), { status: 400 });
      const owned = await tx.select().from(elementPossessions).where(eq(elementPossessions.characterId, character.id));
      const possessions = new Map(owned.map((ownedItem: any) => [ownedItem.elementId, { quantity: ownedItem.quantity, selectedChoices: ownedItem.selectedChoices as Record<string, unknown> }]));
      for (const bonus of selectedBonuses) {
        const evaluation = evaluateRequirements(requirementGroupSchema.parse(bonus.requirements), { profile: (character.profileData ?? {}) as Record<string, unknown>, possessions });
        if (!evaluation.passed) throw Object.assign(new Error(`${character.name} does not meet optional bonus ${bonus.name}`), { status: 409 });
      }
      const optionalYen = selectedBonuses.reduce((sum, bonus) => sum + bonus.yen, 0);
      const optionalExp = selectedBonuses.reduce((sum, bonus) => sum + bonus.exp, 0);
      const quote = calculateEmploymentCompensation(compensation, row.position.levelId, row.position.riskId, row.position.bonusYen + optionalYen, row.position.bonusExp + optionalExp);
      const breakdown = {
        compensationVersion: compensation.version,
        level: compensation.levels.find(entry => entry.id === row.position.levelId),
        risk: compensation.risks.find(entry => entry.id === row.position.riskId),
        positionBonusYen: row.position.bonusYen,
        positionBonusExp: row.position.bonusExp,
        optionalBonuses: selectedBonuses.map(bonus => ({ id: bonus.id, name: bonus.name, yen: bonus.yen, exp: bonus.exp })),
        quote,
      };

      await tx.update(characters).set({ yen: sql`${characters.yen} + ${quote.totalYen}`, exp: sql`${characters.exp} + ${quote.totalExp}`, updatedAt: new Date() }).where(eq(characters.id, character.id));
      const [payment] = await tx.insert(employmentPayments).values({
        id: nanoid(12), batchId, employmentId: row.employment.id, characterId: character.id, positionId: row.position.id,
        characterName: character.name, positionName: row.position.name, periodLabel: normalizedPeriod,
        postsObserved: item.postsObserved, minimumPostsApproved: true, breakdown, totalYen: quote.totalYen,
        totalExp: quote.totalExp, notes: notes?.trim() || null, moderatorUid,
      }).returning();
      results.push(payment);
    }

    await tx.insert(auditLogs).values({ actorUid: moderatorUid, actionType: 'employment_payment_batch', targetId: batchId, details: { periodLabel: normalizedPeriod, paymentIds: results.map(item => item.id), notes: notes?.trim() || null } });
    return { batchId, payments: results };
  });
}

export async function getEmploymentPaymentHistory() {
  return db.select().from(employmentPayments).orderBy(sql`${employmentPayments.createdAt} DESC`);
}

export async function getOwnerEmployments(owner: EmploymentOwner) {
  const ownerCondition = owner.canonCharacterId
    ? eq(characterEmployments.canonCharacterId, owner.canonCharacterId)
    : eq(characterEmployments.characterId, owner.characterId!);
  return await db.select({
    employment: characterEmployments,
    position: positions,
    department: departments,
    institution: institutions,
  })
  .from(characterEmployments)
  .innerJoin(positions, eq(positions.id, characterEmployments.positionId))
  .innerJoin(departments, eq(departments.id, positions.departmentId))
  .innerJoin(institutions, eq(institutions.id, departments.institutionId))
  .where(and(
    ownerCondition,
    eq(characterEmployments.status, 'active')
  ));
}

// Public registry employments
export async function getPublicEmployments() {
  const directCanon = alias(canonCharacters, 'employment_canon');
  const result = await db.select({
    institution: institutions,
    department: departments,
    position: positions,
    employment: characterEmployments,
    character: characters,
    canon: canonCharacters,
    directCanon,
  })
  .from(institutions)
  .innerJoin(departments, eq(departments.institutionId, institutions.id))
  .innerJoin(positions, eq(positions.departmentId, departments.id))
  .leftJoin(characterEmployments, and(eq(characterEmployments.positionId, positions.id), eq(characterEmployments.status, 'active')))
  .leftJoin(characters, eq(characters.id, characterEmployments.characterId))
  .leftJoin(canonCharacters, eq(canonCharacters.id, characters.canonCharacterId))
  .leftJoin(directCanon, eq(directCanon.id, characterEmployments.canonCharacterId))
  .where(eq(institutions.active, true))
  .orderBy(asc(institutions.sortOrder), asc(departments.sortOrder), asc(positions.sortOrder));

  // Group by institution -> department -> position
  const instMap = new Map();
  
  result.forEach(row => {
    if (!instMap.has(row.institution.id)) {
      instMap.set(row.institution.id, {
        ...row.institution,
        departments: new Map()
      });
    }
    const inst = instMap.get(row.institution.id);
    
    if (!inst.departments.has(row.department.id)) {
      inst.departments.set(row.department.id, {
        ...row.department,
        positions: new Map()
      });
    }
    const dep = inst.departments.get(row.department.id);
    
    if (!dep.positions.has(row.position.id)) {
      dep.positions.set(row.position.id, {
        ...row.position,
        occupants: [],
        occupiedSlots: 0
      });
    }
    const pos = dep.positions.get(row.position.id);
    
    if (row.employment && (row.character || row.directCanon)) {
      const canon = row.directCanon || row.canon;
      pos.occupants.push({
        employmentId: row.employment.id,
        characterId: row.character?.id || null,
        name: canon?.name || row.character?.name,
        canon: canon ? { id: canon.id, name: canon.name } : null
      });
      pos.occupiedSlots++;
    }
  });

  return Array.from(instMap.values()).map(inst => ({
    ...inst,
    departments: Array.from(inst.departments.values()).map((dep: any) => ({
      ...dep,
      positions: Array.from(dep.positions.values())
    }))
  }));
}

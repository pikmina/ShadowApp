import { eq, or, and, isNull, isNotNull, asc, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { institutions, departments, positions, characterEmployments, characters, canonCharacters } from './schema.ts';
import { nanoid } from 'nanoid';
import { alias } from 'drizzle-orm/pg-core';

export type EmploymentOwner = { characterId?: number; canonCharacterId?: string };

async function resolveEmploymentOwner(tx: any, owner: EmploymentOwner) {
  if (Number(owner.characterId !== undefined) + Number(owner.canonCharacterId !== undefined) !== 1) {
    throw Object.assign(new Error('Exactly one employment owner is required'), { status: 400 });
  }
  if (owner.canonCharacterId) {
    const [canon] = await tx.select().from(canonCharacters).where(eq(canonCharacters.id, owner.canonCharacterId));
    if (!canon) throw Object.assign(new Error('Canon character not found'), { status: 404 });
    return { characterId: null, canonCharacterId: canon.id };
  }
  const [character] = await tx.select().from(characters).where(eq(characters.id, owner.characterId));
  if (!character) throw Object.assign(new Error('Character not found'), { status: 404 });
  return character.canonCharacterId
    ? { characterId: null, canonCharacterId: character.canonCharacterId }
    : { characterId: character.id, canonCharacterId: null };
}

// --- Institutions ---
export async function getInstitutionsWithDepartmentsAndPositions() {
  const allInstitutions = await db.select().from(institutions).orderBy(asc(institutions.sortOrder), asc(institutions.name));
  const allDepartments = await db.select().from(departments).orderBy(asc(departments.sortOrder), asc(departments.name));
  const allPositions = await db.select().from(positions).orderBy(asc(positions.sortOrder), asc(positions.name));

  // Get active employments to calculate capacity
  const activeEmployments = await db.select({
    positionId: characterEmployments.positionId,
    characterId: characterEmployments.characterId,
  })
  .from(characterEmployments)
  .where(eq(characterEmployments.status, 'active'));

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
            occupiedSlots: occupantsByPosition[pos.id] || 0
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
export async function createPosition(data: { departmentId: string; name: string; description?: string; capacity?: number | null; active?: boolean; sortOrder?: number }) {
  const id = nanoid(10);
  const [created] = await db.insert(positions).values({
    id,
    departmentId: data.departmentId,
    name: data.name,
    description: data.description || null,
    capacity: data.capacity,
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
  }).returning();
  return created;
}

export async function updatePosition(id: string, data: Partial<typeof positions.$inferInsert>) {
  const [updated] = await db.update(positions).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(positions.id, id)).returning();
  return updated;
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

    // Check position
    const [pos] = await tx.select().from(positions).where(eq(positions.id, positionId));
    if (!pos) throw new Error("Position not found");
    if (!pos.active) throw new Error("Position is inactive");

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
      ...resolved,
      positionId,
      status: 'active',
      startedAt: new Date(),
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

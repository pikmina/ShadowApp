import { eq, and, asc, isNull, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { academicYears, classGroups, characterEnrollments, characters, canonCharacters } from './schema.ts';
import { nanoid } from 'nanoid';
import { alias } from 'drizzle-orm/pg-core';

export type EnrollmentOwner = { characterId?: number; canonCharacterId?: string };

async function resolveEnrollmentOwner(tx: any, owner: EnrollmentOwner) {
  if (Number(owner.characterId !== undefined) + Number(owner.canonCharacterId !== undefined) !== 1) {
    throw Object.assign(new Error('Exactly one enrollment owner is required'), { status: 400 });
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

// --- Academic Years ---
export async function getAcademicYearsWithClasses() {
  const years = await db.select().from(academicYears).orderBy(asc(academicYears.sortOrder), asc(academicYears.name));
  const classes = await db.select().from(classGroups).orderBy(asc(classGroups.sortOrder), asc(classGroups.name));
  
  // Get active enrollments to calculate capacity
  const activeEnrollments = await db.select({
    classGroupId: characterEnrollments.classGroupId,
    characterId: characterEnrollments.characterId,
    canonCharacterId: characters.canonCharacterId,
    directCanonCharacterId: characterEnrollments.canonCharacterId,
  })
  .from(characterEnrollments)
  .leftJoin(characters, eq(characters.id, characterEnrollments.characterId))
  .where(eq(characterEnrollments.status, 'active'));

  const occupantsByClass: Record<string, number> = {};
  activeEnrollments.forEach(enr => {
    // Canon characters do NOT consume capacity
    if (enr.directCanonCharacterId === null && enr.canonCharacterId === null) {
      occupantsByClass[enr.classGroupId] = (occupantsByClass[enr.classGroupId] || 0) + 1;
    }
  });

  return years.map(year => {
    const yearClasses = classes.filter(c => c.academicYearId === year.id);
    return {
      ...year,
      classes: yearClasses.map(cls => ({
        ...cls,
        usedSlots: occupantsByClass[cls.id] || 0
      }))
    };
  });
}

export async function createAcademicYear(data: { name: string; active?: boolean; sortOrder?: number }) {
  const id = nanoid(10);
  const [created] = await db.insert(academicYears).values({
    id,
    name: data.name,
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
  }).returning();
  return created;
}

export async function updateAcademicYear(id: string, data: Partial<typeof academicYears.$inferInsert>) {
  const [updated] = await db.update(academicYears).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(academicYears.id, id)).returning();
  return updated;
}

export async function deleteAcademicYear(id: string) {
  const classes = await db.select().from(classGroups).where(eq(classGroups.academicYearId, id)).limit(1);
  if (classes.length > 0) throw new Error("Cannot delete academic year with classes.");
  await db.delete(academicYears).where(eq(academicYears.id, id));
}

// --- Class Groups ---
export async function createClassGroup(data: { academicYearId: string; name: string; description?: string | null; capacity: number; active?: boolean | null; sortOrder?: number | null; courseType?: string | null }) {
  const id = nanoid(10);
  const [created] = await db.insert(classGroups).values({
    id,
    academicYearId: data.academicYearId,
    name: data.name,
    description: data.description || null,
    capacity: data.capacity,
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
    courseType: data.courseType || null,
  }).returning();
  return created;
}

export async function updateClassGroup(id: string, data: Partial<typeof classGroups.$inferInsert>) {
  const [updated] = await db.update(classGroups).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(classGroups.id, id)).returning();
  return updated;
}

export async function deleteClassGroup(id: string) {
  const enr = await db.select().from(characterEnrollments).where(eq(characterEnrollments.classGroupId, id)).limit(1);
  if (enr.length > 0) throw new Error("Cannot delete class group with enrolled characters.");
  await db.delete(classGroups).where(eq(classGroups.id, id));
}

// --- Enrollments ---
export async function enrollOwner(owner: EnrollmentOwner, classGroupId: string) {
  return await db.transaction(async (tx) => {
    const resolved = await resolveEnrollmentOwner(tx, owner);

    // Check class
    const [cls] = await tx.select().from(classGroups).where(eq(classGroups.id, classGroupId));
    if (!cls) throw new Error("Class not found");
    if (!cls.active) throw new Error("Class is inactive");

    // "Un personaje sólo puede tener una inscripción académica activa a la vez."
    const ownerCondition = resolved.canonCharacterId
      ? eq(characterEnrollments.canonCharacterId, resolved.canonCharacterId)
      : eq(characterEnrollments.characterId, resolved.characterId!);
    const [existingActive] = await tx.select().from(characterEnrollments).where(and(
      ownerCondition,
      eq(characterEnrollments.status, 'active')
    ));
    if (existingActive) {
      const error = new Error("Character already has an active academic enrollment");
      (error as any).status = 409;
      throw error;
    }

    // Check capacity if the character is an original character (canonCharacterId == null)
    if (resolved.canonCharacterId === null) {
      if (cls.capacity === 0) {
        const error = new Error("Class does not accept any occupants");
        (error as any).status = 409;
        throw error;
      }

      // Count only original characters
      const [activeOriginals] = await tx.select({ count: sql<number>`count(*)` })
        .from(characterEnrollments)
        .innerJoin(characters, eq(characters.id, characterEnrollments.characterId))
        .where(and(
          eq(characterEnrollments.classGroupId, classGroupId),
          eq(characterEnrollments.status, 'active'),
          isNull(characters.canonCharacterId)
        ));

      if (Number(activeOriginals.count) >= cls.capacity) {
        const error = new Error("Class capacity reached for original characters");
        (error as any).status = 409;
        throw error;
      }
    }

    const [created] = await tx.insert(characterEnrollments).values({
      id: nanoid(10),
      ...resolved,
      classGroupId,
      status: 'active',
      enrolledAt: new Date(),
    }).returning();
    return created;
  });
}

export const enrollCharacter = (characterId: number, classGroupId: string) => enrollOwner({ characterId }, classGroupId);
export const enrollCanonCharacter = (canonCharacterId: string, classGroupId: string) => enrollOwner({ canonCharacterId }, classGroupId);

export async function removeCharacterEnrollment(id: string) {
  const [deleted] = await db.delete(characterEnrollments).where(eq(characterEnrollments.id, id)).returning();
  if (!deleted) {
    const error = new Error("Enrollment not found");
    (error as any).status = 404;
    throw error;
  }
  return deleted;
}

export async function getCharacterEnrollment(characterId: number) {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
  if (!character) return null;
  return getOwnerEnrollment(character.canonCharacterId ? { canonCharacterId: character.canonCharacterId } : { characterId });
}

export async function getOwnerEnrollment(owner: EnrollmentOwner) {
  const ownerCondition = owner.canonCharacterId
    ? eq(characterEnrollments.canonCharacterId, owner.canonCharacterId)
    : eq(characterEnrollments.characterId, owner.characterId!);
  const [enrollment] = await db.select({
    enrollment: characterEnrollments,
    classGroup: classGroups,
    academicYear: academicYears,
  })
  .from(characterEnrollments)
  .innerJoin(classGroups, eq(classGroups.id, characterEnrollments.classGroupId))
  .innerJoin(academicYears, eq(academicYears.id, classGroups.academicYearId))
  .where(and(
    ownerCondition,
    eq(characterEnrollments.status, 'active')
  ));
  return enrollment || null;
}

// Public registry classes
export async function getPublicClasses() {
  const directCanon = alias(canonCharacters, 'enrollment_canon');
  const result = await db.select({
    year: academicYears,
    classGroup: classGroups,
    enrollment: characterEnrollments,
    character: characters,
    canon: canonCharacters,
    directCanon,
  })
  .from(academicYears)
  .innerJoin(classGroups, eq(classGroups.academicYearId, academicYears.id))
  .leftJoin(characterEnrollments, and(eq(characterEnrollments.classGroupId, classGroups.id), eq(characterEnrollments.status, 'active')))
  .leftJoin(characters, eq(characters.id, characterEnrollments.characterId))
  .leftJoin(canonCharacters, eq(canonCharacters.id, characters.canonCharacterId))
  .leftJoin(directCanon, eq(directCanon.id, characterEnrollments.canonCharacterId))
  .where(eq(academicYears.active, true))
  .orderBy(asc(academicYears.sortOrder), asc(classGroups.sortOrder));

  const yearMap = new Map();

  result.forEach(row => {
    if (!yearMap.has(row.year.id)) {
      yearMap.set(row.year.id, {
        ...row.year,
        classes: new Map()
      });
    }
    const year = yearMap.get(row.year.id);

    if (!year.classes.has(row.classGroup.id)) {
      year.classes.set(row.classGroup.id, {
        ...row.classGroup,
        students: [],
        usedSlots: 0
      });
    }
    const cls = year.classes.get(row.classGroup.id);

    if (row.enrollment && (row.character || row.directCanon)) {
      const canon = row.directCanon || row.canon;
      cls.students.push({
        enrollmentId: row.enrollment.id,
        characterId: row.character?.id || null,
        name: canon?.name || row.character?.name,
        canon: canon ? { id: canon.id, name: canon.name } : null
      });
      // Increment used slots if original character
      if (!canon) {
        cls.usedSlots++;
      }
    }
  });

  return Array.from(yearMap.values()).map(year => ({
    ...year,
    classes: Array.from(year.classes.values())
  }));
}

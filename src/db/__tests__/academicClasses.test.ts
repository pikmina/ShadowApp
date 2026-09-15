import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../index.ts';
import { academicYears, canonCharacters, characterEnrollments, characters, classGroups, users } from '../schema.ts';
import { createCanonCharacter } from '../canonCharacters.ts';
import { createCharacter, deleteCharacter } from '../characters.ts';
import {
  createAcademicYear,
  createClassGroup,
  deleteClassGroup,
  enrollCanonCharacter,
  enrollCharacter,
  getAcademicYearsWithClasses,
  getCharacterEnrollment,
  getOwnerEnrollment,
  getPublicClasses,
  removeCharacterEnrollment,
} from '../academicClasses.ts';

let dbAvailable = false;
let userId = 0;
let canonId = '';
let linkedCharacterId = 0;
let originalCharacterId = 0;
let secondOriginalCharacterId = 0;
let yearId = '';
let classId = '';
let canonEnrollmentId = '';
let originalEnrollmentId = '';

try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch {
  console.warn('DB not available for integration test.');
}

describe.skipIf(!dbAvailable)('Academic Classes Integration', () => {
  beforeAll(async () => {
    const suffix = nanoid(8);
    const [user] = await db.insert(users).values({
      uid: `classes_user_${suffix}`,
      email: `classes_${suffix}@example.com`,
      role: 'player',
    }).returning();
    userId = user.id;

    canonId = (await createCanonCharacter({ name: `Class Canon ${suffix}` })).id;
    linkedCharacterId = (await createCharacter(userId, `Linked Student ${suffix}`, {}, canonId)).id;
    originalCharacterId = (await createCharacter(userId, `Original Student ${suffix}`, {})).id;
    secondOriginalCharacterId = (await createCharacter(userId, `Second Student ${suffix}`, {})).id;
    yearId = (await createAcademicYear({ name: `Academic Year ${suffix}` })).id;
    classId = (await createClassGroup({
      academicYearId: yearId,
      name: `Class 1-A ${suffix}`,
      description: 'Hero course',
      courseType: 'Hero',
      capacity: 1,
    })).id;
  });

  afterAll(async () => {
    if (canonEnrollmentId || originalEnrollmentId) {
      await db.delete(characterEnrollments).where(inArray(characterEnrollments.id, [canonEnrollmentId, originalEnrollmentId].filter(Boolean)));
    }
    const characterIds = [linkedCharacterId, originalCharacterId, secondOriginalCharacterId].filter(Boolean);
    if (characterIds.length) await db.delete(characters).where(inArray(characters.id, characterIds));
    if (classId) await db.delete(classGroups).where(eq(classGroups.id, classId));
    if (yearId) await db.delete(academicYears).where(eq(academicYears.id, yearId));
    if (canonId) await db.delete(canonCharacters).where(eq(canonCharacters.id, canonId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });

  test('1. normalizes enrollment through a linked sheet to the canon owner', async () => {
    const enrollment = await enrollCharacter(linkedCharacterId, classId);
    canonEnrollmentId = enrollment.id;
    expect(enrollment.characterId).toBeNull();
    expect(enrollment.canonCharacterId).toBe(canonId);
  });

  test('2. resolves canon enrollment when queried through the linked sheet', async () => {
    const enrollment = await getCharacterEnrollment(linkedCharacterId);
    expect(enrollment?.enrollment.id).toBe(canonEnrollmentId);
    expect(enrollment?.classGroup.courseType).toBe('Hero');
  });

  test('3. rejects a second active enrollment for the canon', async () => {
    await expect(enrollCanonCharacter(canonId, classId)).rejects.toMatchObject({ status: 409 });
  });

  test('4. excludes canon students from class capacity', async () => {
    const years = await getAcademicYearsWithClasses();
    const classGroup = years.flatMap((year) => year.classes).find((entry) => entry.id === classId);
    expect(classGroup?.usedSlots).toBe(0);
  });

  test('5. allows one original student and counts its slot', async () => {
    const enrollment = await enrollCharacter(originalCharacterId, classId);
    originalEnrollmentId = enrollment.id;
    expect(enrollment.characterId).toBe(originalCharacterId);

    const years = await getAcademicYearsWithClasses();
    const classGroup = years.flatMap((year) => year.classes).find((entry) => entry.id === classId);
    expect(classGroup?.usedSlots).toBe(1);
  });

  test('6. rejects another original student when capacity is reached', async () => {
    await expect(enrollCharacter(secondOriginalCharacterId, classId)).rejects.toMatchObject({ status: 409 });
  });

  test('7. exposes canon and original students publicly with accurate used slots', async () => {
    const publicYears = await getPublicClasses();
    const classGroup = publicYears
      .flatMap((year: any) => year.classes)
      .find((entry: any) => entry.id === classId);

    expect(classGroup.usedSlots).toBe(1);
    expect(classGroup.students).toEqual(expect.arrayContaining([
      expect.objectContaining({ characterId: null, canon: expect.objectContaining({ id: canonId }) }),
      expect.objectContaining({ characterId: originalCharacterId, canon: null }),
    ]));
  });

  test('8. preserves canon enrollment after sheet deletion and protects its class', async () => {
    await deleteCharacter(linkedCharacterId);
    linkedCharacterId = 0;

    const enrollment = await getOwnerEnrollment({ canonCharacterId: canonId });
    expect(enrollment?.enrollment.id).toBe(canonEnrollmentId);
    await expect(deleteClassGroup(classId)).rejects.toThrow('enrolled characters');

    await removeCharacterEnrollment(canonEnrollmentId);
    canonEnrollmentId = '';
  });
});

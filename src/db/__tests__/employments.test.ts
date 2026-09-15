import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../index.ts';
import { canonCharacters, characterEmployments, characters, departments, institutions, positions, users } from '../schema.ts';
import { createCanonCharacter, deleteCanonCharacter } from '../canonCharacters.ts';
import { createCharacter, deleteCharacter } from '../characters.ts';
import {
  assignCanonEmployment,
  assignCharacterEmployment,
  createDepartment,
  createInstitution,
  createPosition,
  deletePosition,
  getCharacterEmployments,
  getInstitutionsWithDepartmentsAndPositions,
  getOwnerEmployments,
  getPublicEmployments,
  removeCharacterEmployment,
} from '../employments.ts';

let dbAvailable = false;
let userId = 0;
let canonId = '';
let linkedCharacterId = 0;
let originalCharacterId = 0;
let institutionId = '';
let departmentId = '';
let positionId = '';
let zeroCapacityPositionId = '';
let canonEmploymentId = '';
let originalEmploymentId = '';

try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch {
  console.warn('DB not available for integration test.');
}

describe.skipIf(!dbAvailable)('Employments Integration', () => {
  beforeAll(async () => {
    const suffix = nanoid(8);
    const [user] = await db.insert(users).values({
      uid: `employment_user_${suffix}`,
      email: `employment_${suffix}@example.com`,
      role: 'player',
    }).returning();
    userId = user.id;

    const canon = await createCanonCharacter({ name: `Employment Canon ${suffix}` });
    canonId = canon.id;
    linkedCharacterId = (await createCharacter(userId, `Linked ${suffix}`, {}, canonId)).id;
    originalCharacterId = (await createCharacter(userId, `Original ${suffix}`, {})).id;

    institutionId = (await createInstitution({ name: `Institution ${suffix}` })).id;
    departmentId = (await createDepartment({ institutionId, name: `Department ${suffix}` })).id;
    positionId = (await createPosition({ departmentId, name: `Position ${suffix}`, capacity: 1 })).id;
    zeroCapacityPositionId = (await createPosition({ departmentId, name: `Closed ${suffix}`, capacity: 0 })).id;
  });

  afterAll(async () => {
    if (canonEmploymentId || originalEmploymentId) {
      await db.delete(characterEmployments).where(inArray(characterEmployments.id, [canonEmploymentId, originalEmploymentId].filter(Boolean)));
    }
    if (linkedCharacterId || originalCharacterId) {
      await db.delete(characters).where(inArray(characters.id, [linkedCharacterId, originalCharacterId].filter(Boolean)));
    }
    if (positionId || zeroCapacityPositionId) {
      await db.delete(positions).where(inArray(positions.id, [positionId, zeroCapacityPositionId].filter(Boolean)));
    }
    if (departmentId) await db.delete(departments).where(eq(departments.id, departmentId));
    if (institutionId) await db.delete(institutions).where(eq(institutions.id, institutionId));
    if (canonId) await db.delete(canonCharacters).where(eq(canonCharacters.id, canonId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });

  test('1. normalizes an employment assigned through a linked sheet to the canon owner', async () => {
    const employment = await assignCharacterEmployment(linkedCharacterId, positionId);
    canonEmploymentId = employment.id;
    expect(employment.characterId).toBeNull();
    expect(employment.canonCharacterId).toBe(canonId);
  });

  test('2. resolves canon employment when queried through the linked sheet', async () => {
    const employments = await getCharacterEmployments(linkedCharacterId);
    expect(employments).toHaveLength(1);
    expect(employments[0].employment.id).toBe(canonEmploymentId);
  });

  test('3. rejects a duplicate active canon employment', async () => {
    await expect(assignCanonEmployment(canonId, positionId)).rejects.toMatchObject({ status: 409 });
  });

  test('4. counts a canon employment against position capacity', async () => {
    const institutionsResult = await getInstitutionsWithDepartmentsAndPositions();
    const position = institutionsResult
      .flatMap((institution) => institution.departments)
      .flatMap((department) => department.positions)
      .find((entry) => entry.id === positionId);

    expect(position?.occupiedSlots).toBe(1);
    await expect(assignCharacterEmployment(originalCharacterId, positionId)).rejects.toMatchObject({ status: 409 });
  });

  test('5. exposes a direct canon occupant in the public registry', async () => {
    const publicInstitutions = await getPublicEmployments();
    const position = publicInstitutions
      .flatMap((institution: any) => institution.departments)
      .flatMap((department: any) => department.positions)
      .find((entry: any) => entry.id === positionId);

    expect(position.occupants).toContainEqual(expect.objectContaining({
      characterId: null,
      canon: expect.objectContaining({ id: canonId }),
    }));
  });

  test('6. preserves canon employment after deleting its linked sheet', async () => {
    await deleteCharacter(linkedCharacterId);
    linkedCharacterId = 0;

    const employments = await getOwnerEmployments({ canonCharacterId: canonId });
    expect(employments).toHaveLength(1);
    expect(employments[0].employment.id).toBe(canonEmploymentId);
  });

  test('7. protects related canon and position from deletion', async () => {
    await expect(deleteCanonCharacter(canonId)).rejects.toBeDefined();
    await expect(deletePosition(positionId)).rejects.toThrow('assigned characters');
  });

  test('8. releases capacity after removing employment and enforces zero capacity', async () => {
    await removeCharacterEmployment(canonEmploymentId);
    canonEmploymentId = '';
    const employment = await assignCharacterEmployment(originalCharacterId, positionId);
    originalEmploymentId = employment.id;

    expect(employment.characterId).toBe(originalCharacterId);
    await expect(assignCharacterEmployment(originalCharacterId, zeroCapacityPositionId)).rejects.toMatchObject({ status: 409 });
  });
});

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../index.ts';
import { canonCharacters, characterEmployments, employmentPayments, characters, departments, institutions, positions, users } from '../schema.ts';
import { createCanonCharacter, deleteCanonCharacter } from '../canonCharacters.ts';
import { createCharacter, deleteCharacter } from '../characters.ts';
import { seedCoreRules } from '../rules.ts';
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
  getEmploymentPaymentHistory,
  getPublicEmployments,
  payEmploymentBatch,
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
let restrictedPositionId = '';
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
    await seedCoreRules();
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
    positionId = (await createPosition({ departmentId, name: `Position ${suffix}`, capacity: 1, levelId: 'level_4', riskId: 'moderate', minPosts: 2 })).id;
    zeroCapacityPositionId = (await createPosition({ departmentId, name: `Closed ${suffix}`, capacity: 0 })).id;
    restrictedPositionId = (await createPosition({
      departmentId, name: `Restricted ${suffix}`, capacity: 2, levelId: 'level_3', riskId: 'serious', minPosts: 4,
      requirements: { operator: 'all', requirements: [{ id: 'adult', type: 'age', comparison: 'gte', value: 18 }] },
      optionalBonuses: [{ id: 'rescue-bonus', name: 'Rescate', requirements: { operator: 'all', requirements: [] }, yen: 25, exp: 10 }],
    })).id;
  });

  afterAll(async () => {
    await db.delete(employmentPayments).where(eq(employmentPayments.positionId, positionId));
    if (canonEmploymentId || originalEmploymentId) {
      await db.delete(characterEmployments).where(inArray(characterEmployments.id, [canonEmploymentId, originalEmploymentId].filter(Boolean)));
    }
    if (linkedCharacterId || originalCharacterId) {
      await db.delete(characters).where(inArray(characters.id, [linkedCharacterId, originalCharacterId].filter(Boolean)));
    }
    if (positionId || zeroCapacityPositionId || restrictedPositionId) {
      await db.delete(positions).where(inArray(positions.id, [positionId, zeroCapacityPositionId, restrictedPositionId].filter(Boolean)));
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
    expect(employment.requirementsVerified).toBe(true);
  });

  test('stores compensation metadata and enforces automatic requirements', async () => {
    const structure = await getInstitutionsWithDepartmentsAndPositions();
    const position = structure.flatMap(item => item.departments).flatMap(item => item.positions).find(item => item.id === restrictedPositionId);
    expect(position).toMatchObject({ levelId: 'level_3', riskId: 'serious', minPosts: 4, bonusYen: 0, bonusExp: 0 });
    expect(position?.optionalBonuses).toHaveLength(1);
    await expect(assignCharacterEmployment(originalCharacterId, restrictedPositionId)).rejects.toMatchObject({ status: 409 });
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
    expect(position?.occupants).toContainEqual(expect.objectContaining({
      employmentId: canonEmploymentId,
      canonCharacterId: canonId,
      requirementsVerified: true,
    }));
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

  test('6. pays an approved employment once per period and preserves its snapshot', async () => {
    const before = (await db.select().from(characters).where(eq(characters.id, linkedCharacterId)))[0];
    const result = await payEmploymentBatch('test-moderator', 'September 2026', 'Forum reviewed', [{
      employmentId: canonEmploymentId, postsObserved: 3, minimumPostsApproved: true,
    }]);
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0]).toMatchObject({ totalYen: 230, totalExp: 210, postsObserved: 3, minimumPostsApproved: true });
    const after = (await db.select().from(characters).where(eq(characters.id, linkedCharacterId)))[0];
    expect(after.yen).toBe(before.yen + 230);
    expect(after.exp).toBe(before.exp + 210);
    expect((await getEmploymentPaymentHistory()).find(item => item.id === result.payments[0].id)?.breakdown).toMatchObject({ compensationVersion: 1 });
    await expect(payEmploymentBatch('test-moderator', 'September 2026', null, [{ employmentId: canonEmploymentId, postsObserved: 3, minimumPostsApproved: true }])).rejects.toMatchObject({ status: 409 });
  });

  test('7. preserves canon employment after deleting its linked sheet', async () => {
    await deleteCharacter(linkedCharacterId);
    linkedCharacterId = 0;

    const employments = await getOwnerEmployments({ canonCharacterId: canonId });
    expect(employments).toHaveLength(1);
    expect(employments[0].employment.id).toBe(canonEmploymentId);
  });

  test('8. protects related canon and position from deletion', async () => {
    await expect(deleteCanonCharacter(canonId)).rejects.toBeDefined();
    await expect(deletePosition(positionId)).rejects.toThrow('assigned characters');
  });

  test('9. releases capacity after removing employment and enforces zero capacity', async () => {
    await removeCharacterEmployment(canonEmploymentId);
    canonEmploymentId = '';
    const employment = await assignCharacterEmployment(originalCharacterId, positionId);
    originalEmploymentId = employment.id;

    expect(employment.characterId).toBe(originalCharacterId);
    await expect(assignCharacterEmployment(originalCharacterId, zeroCapacityPositionId)).rejects.toMatchObject({ status: 409 });
  });
});

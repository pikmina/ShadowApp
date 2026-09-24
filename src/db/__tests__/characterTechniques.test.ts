import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { db } from '../index.ts';
import { users, characters, systemElements, elementPossessions } from '../schema.ts';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createCharacterTechnique,
  getCharacterTechniqueById,
  getCharacterTechniquesByCharacterId,
  updateCharacterTechnique,
  deleteCharacterTechnique,
} from '../characterTechniques.ts';
import { createCharacter, deleteCharacter, getCharacterWithTechniques } from '../characters.ts';
import { createDefaultMechanicalBehavior, type MechanicalBehavior } from '../../domain/mechanicalBehavior.ts';

let testUserId: number;
let testCharIdA: number;
let testCharIdB: number;
let dbAvailable = false;

try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch (e) {
  console.warn('DB not available for integration test.');
}

describe.skipIf(!dbAvailable)('Character-Owned Techniques Integrity & Invariants (Task 26.1)', () => {
  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        uid: 'tech_audit_user_' + nanoid(5),
        email: 'tech_audit@example.com',
        role: 'player',
      })
      .returning();
    testUserId = user.id;

    const charA = await createCharacter(testUserId, 'Hero Alpha', {
      bio: 'Alpha hero',
    });
    testCharIdA = charA.id;

    const charB = await createCharacter(testUserId, 'Hero Beta', {
      bio: 'Beta hero',
    });
    testCharIdB = charB.id;
  });

  afterAll(async () => {
    if (testCharIdA) {
      await deleteCharacter(testCharIdA);
    }
    if (testCharIdB) {
      await deleteCharacter(testCharIdB);
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  // Scenario A: Character deletion cascades Techniques through DB FK
  test('Scenario A: Character deletion cascades Techniques through DB FK constraint', async () => {
    const tempChar = await createCharacter(testUserId, 'Cascade Target Hero', {});
    
    const tech = await createCharacterTechnique({
      characterId: tempChar.id,
      name: 'Cascading Strike',
      sourceType: 'physical',
      level: 2,
    });

    const techBefore = await getCharacterTechniqueById(tech.id);
    expect(techBefore).not.toBeNull();

    // Directly delete the character row from the database (bypassing application deleteCharacter)
    // to prove that the database FK ON DELETE CASCADE constraint itself removes the character_techniques row.
    await db.delete(characters).where(eq(characters.id, tempChar.id));

    const techAfter = await getCharacterTechniqueById(tech.id);
    expect(techAfter).toBeNull();
  });

  // Scenario B: update cannot transfer characterId
  test('Scenario B: update rejects ownership transfer attempts (strict immutability)', async () => {
    const tech = await createCharacterTechnique({
      characterId: testCharIdA,
      name: 'Owner Locked Technique',
      sourceType: 'quirk',
    });

    // Attempting to pass characterId to updateCharacterTechnique must be rejected by validation
    await expect(
      updateCharacterTechnique(tech.id, {
        characterId: testCharIdB,
        name: 'Hijacked Technique',
      } as any)
    ).rejects.toThrow();

    // Verify ownership was NOT changed in DB
    const fetched = await getCharacterTechniqueById(tech.id);
    expect(fetched?.characterId).toBe(testCharIdA);
    expect(fetched?.name).toBe('Owner Locked Technique');

    await deleteCharacterTechnique(tech.id);
  });

  // Scenario C: Nonexistent Character cannot own Technique (relational FK integrity)
  test('Scenario C: Nonexistent Character cannot own Technique (DB FK rejection)', async () => {
    const NON_EXISTENT_CHAR_ID = 99999999;

    let thrownError: any = null;
    try {
      await createCharacterTechnique({
        characterId: NON_EXISTENT_CHAR_ID,
        name: 'Orphan Technique',
        sourceType: 'physical',
      });
    } catch (err: any) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    const causeMsg = thrownError?.cause?.message || thrownError?.message || '';
    const causeCode = thrownError?.cause?.code || '';
    // Postgres 23503 is foreign_key_violation
    expect(causeCode === '23503' || /foreign key|violates foreign key/i.test(causeMsg)).toBe(true);
  });

  // Scenario D: Same Technique name can exist for two Characters
  test('Scenario D: Same Technique name can exist for two different Characters', async () => {
    const sharedName = 'Barrido Simple';

    const techA = await createCharacterTechnique({
      characterId: testCharIdA,
      name: sharedName,
      sourceType: 'physical',
      level: 1,
    });

    const techB = await createCharacterTechnique({
      characterId: testCharIdB,
      name: sharedName,
      sourceType: 'physical',
      level: 2,
    });

    expect(techA.id).not.toBe(techB.id);
    expect(techA.name).toBe(sharedName);
    expect(techB.name).toBe(sharedName);
    expect(techA.characterId).toBe(testCharIdA);
    expect(techB.characterId).toBe(testCharIdB);

    await deleteCharacterTechnique(techA.id);
    await deleteCharacterTechnique(techB.id);
  });

  // Scenario E: Database rejects level 0 (DB check constraint boundary)
  test('Scenario E: Database rejects level 0 via character_techniques_level_check', async () => {
    const rawInsertSql = sql`
      INSERT INTO character_techniques (id, character_id, name, level, source_type, mechanical_behaviors)
      VALUES (${nanoid()}, ${testCharIdA}, 'Invalid Level 0', 0, 'physical', '[]'::jsonb);
    `;

    let thrownError: any = null;
    try {
      await db.execute(rawInsertSql);
    } catch (err: any) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    const constraintName = thrownError?.cause?.constraint || thrownError?.cause?.message || '';
    const causeCode = thrownError?.cause?.code || '';
    // Postgres 23514 is check_violation
    expect(
      causeCode === '23514' ||
      constraintName.includes('character_techniques_level_check') ||
      /check constraint/i.test(constraintName)
    ).toBe(true);
  });

  // Scenario F: Database rejects level 6 (DB check constraint boundary)
  test('Scenario F: Database rejects level 6 via character_techniques_level_check', async () => {
    const rawInsertSql = sql`
      INSERT INTO character_techniques (id, character_id, name, level, source_type, mechanical_behaviors)
      VALUES (${nanoid()}, ${testCharIdA}, 'Invalid Level 6', 6, 'physical', '[]'::jsonb);
    `;

    let thrownError: any = null;
    try {
      await db.execute(rawInsertSql);
    } catch (err: any) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    const constraintName = thrownError?.cause?.constraint || thrownError?.cause?.message || '';
    const causeCode = thrownError?.cause?.code || '';
    // Postgres 23514 is check_violation
    expect(
      causeCode === '23514' ||
      constraintName.includes('character_techniques_level_check') ||
      /check constraint/i.test(constraintName)
    ).toBe(true);
  });

  // Scenario G: Database rejects invalid sourceType
  test('Scenario G: Database rejects invalid sourceType via technique_source_type enum', async () => {
    const rawInsertSql = sql`
      INSERT INTO character_techniques (id, character_id, name, level, source_type, mechanical_behaviors)
      VALUES (${nanoid()}, ${testCharIdA}, 'Invalid Source', 1, 'utility', '[]'::jsonb);
    `;

    let thrownError: any = null;
    try {
      await db.execute(rawInsertSql);
    } catch (err: any) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    const causeMsg = thrownError?.cause?.message || thrownError?.message || '';
    const causeCode = thrownError?.cause?.code || '';
    // Postgres 22P02 is invalid_text_representation
    expect(
      causeCode === '22P02' ||
      /invalid input value for enum technique_source_type/i.test(causeMsg)
    ).toBe(true);
  });

  // Scenario H: Repository rejects invalid MechanicalBehavior
  test('Scenario H: Repository rejects invalid MechanicalBehavior payload on create and update', async () => {
    const invalidBehavior: any = {
      id: 'beh_bad',
      mode: 'unsupported_mode',
      effects: [{ type: 'invalid_type', amount: 'non_number' }],
    };

    await expect(
      createCharacterTechnique({
        characterId: testCharIdA,
        name: 'Bad Behavior Tech',
        sourceType: 'weapon',
        mechanicalBehaviors: [invalidBehavior],
      })
    ).rejects.toThrow();

    const validTech = await createCharacterTechnique({
      characterId: testCharIdA,
      name: 'Good Tech',
      sourceType: 'weapon',
    });

    await expect(
      updateCharacterTechnique(validTech.id, {
        mechanicalBehaviors: [invalidBehavior],
      })
    ).rejects.toThrow();

    await deleteCharacterTechnique(validTech.id);
  });

  // Scenario I: Revision conflict does not mutate record
  test('Scenario I: Revision conflict rejects update and leaves record unmodified', async () => {
    const tech = await createCharacterTechnique({
      characterId: testCharIdA,
      name: 'Initial Name',
      level: 1,
      sourceType: 'quirk',
    });

    expect(tech.revision).toBe(1);

    // Update 1: successful, advances revision to 2
    const updated1 = await updateCharacterTechnique(
      tech.id,
      { name: 'Updated Name', level: 2 },
      1
    );
    expect(updated1.revision).toBe(2);

    // Update 2 with stale revision 1 must be rejected
    await expect(
      updateCharacterTechnique(
        tech.id,
        { name: 'Stale Overwrite Attempt', level: 5 },
        1
      )
    ).rejects.toThrow(/revision mismatch|Conflict/i);

    // Verify record was not mutated by the failed attempt
    const current = await getCharacterTechniqueById(tech.id);
    expect(current?.name).toBe('Updated Name');
    expect(current?.level).toBe(2);
    expect(current?.revision).toBe(2);

    await deleteCharacterTechnique(tech.id);
  });

  // Scenario J: Create defaults are deterministic
  test('Scenario J: Create defaults are deterministic across domain and persistence', async () => {
    const created = await createCharacterTechnique({
      characterId: testCharIdA,
      name: 'Default Test Technique',
      sourceType: 'physical',
    });

    expect(created.description).toBe('');
    expect(created.level).toBe(1);
    expect(created.mechanicalBehaviors).toEqual([]);
    expect(created.revision).toBe(1);

    const fetched = await getCharacterTechniqueById(created.id);
    expect(fetched?.description).toBe('');
    expect(fetched?.level).toBe(1);
    expect(fetched?.mechanicalBehaviors).toEqual([]);
    expect(fetched?.revision).toBe(1);

    await deleteCharacterTechnique(created.id);
  });

  // Scenario K: Legacy Technique behavior remains unchanged
  test('Scenario K: Legacy System Elements & Entitlements remain completely isolated and functional', async () => {
    // Legacy system_elements of kind 'technique_entitlement'
    const legacyElemId = 'legacy_tech_' + nanoid(6);
    const [legacyElem] = await db
      .insert(systemElements)
      .values({
        id: legacyElemId,
        name: 'Legacy Entitlement Item',
        kind: 'technique_entitlement',
        description: 'Legacy entitlement object',
        status: 'published',
      })
      .returning();

    // Assign possession to Character A
    const [possession] = await db
      .insert(elementPossessions)
      .values({
        id: 'poss_' + nanoid(6),
        characterId: testCharIdA,
        elementId: legacyElem.id,
        quantity: 1,
      })
      .returning();

    // Query possessions and verify legacy isolation
    const charPossessions = await db
      .select()
      .from(elementPossessions)
      .where(eq(elementPossessions.characterId, testCharIdA));

    expect(charPossessions.some((p) => p.id === possession.id)).toBe(true);

    // Verify characterTechniques table does not contain legacy element
    const charTechniques = await getCharacterTechniquesByCharacterId(testCharIdA);
    expect(charTechniques.some((t) => t.id === legacyElemId)).toBe(false);

    // Clean up legacy element
    await db.delete(elementPossessions).where(eq(elementPossessions.id, possession.id));
    await db.delete(systemElements).where(eq(systemElements.id, legacyElem.id));
  });

  // Scenario L: Activation Attribute persistence lifecycle (Task 33.3)
  test('Scenario L: Activation Attribute persistence, reload, update and preservation (Task 33.3)', async () => {
    // 1. Create with activationAttributeId = INT
    const created = await createCharacterTechnique({
      characterId: testCharIdA,
      name: 'Rayo Mental',
      description: 'Ataque psíquico concentrado',
      level: 1,
      sourceType: 'quirk',
      activationAttributeId: 'INT',
      mechanicalBehaviors: [],
    });

    expect(created.activationAttributeId).toBe('INT');

    // 2. Fetch and verify hydration
    const loaded = await getCharacterTechniqueById(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.activationAttributeId).toBe('INT');

    // 3. Update to VEL
    const updated = await updateCharacterTechnique(created.id, {
      activationAttributeId: 'VEL',
      expectedRevision: loaded!.revision,
    });
    expect(updated.activationAttributeId).toBe('VEL');
    expect(updated.revision).toBe(2);

    // 4. Reload and verify new persisted value
    const reloaded = await getCharacterTechniqueById(created.id);
    expect(reloaded?.activationAttributeId).toBe('VEL');

    // 5. Update another field (description) and verify activationAttributeId is preserved
    const updatedDesc = await updateCharacterTechnique(created.id, {
      description: 'Nueva descripción',
      expectedRevision: reloaded!.revision,
    });
    expect(updatedDesc.activationAttributeId).toBe('VEL');
    expect(updatedDesc.description).toBe('Nueva descripción');

    // Clean up
    await deleteCharacterTechnique(created.id);
  });
});

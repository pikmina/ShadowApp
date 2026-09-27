import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../index.ts';
import { characters, users, systemElements, elementPossessions } from '../schema.ts';
import { eq } from 'drizzle-orm';
import { upsertElement, getElement, deleteElement } from '../elements.ts';
import { getCharactersWithPossessions } from '../characters.ts';
import { nanoid } from 'nanoid';

let dbAvailable = false;
try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch (e) {
  console.warn('DB not available for integration test.');
}

describe.skipIf(!dbAvailable)('Disposable Element Lifecycle with Character Assignment and Propagation', () => {
  let testUserId: number;
  let testCharacterId: number;
  let testElementId: string;
  let duplicateElementId: string;

  beforeAll(async () => {
    // 1. Create a temporary user and character
    const [user] = await db.insert(users).values({
      uid: 'test_lifecycle_user_' + nanoid(6),
      email: 'test_lifecycle@example.com',
      role: 'moderator',
    }).returning();
    testUserId = user.id;

    const [char] = await db.insert(characters).values({
      userId: testUserId,
      name: 'Personaje de Prueba Temporal',
      profileData: { basic_name: 'Personaje de Prueba Temporal' },
    }).returning();
    testCharacterId = char.id;
  });

  afterAll(async () => {
    // Cleanup any lingering records
    if (testCharacterId) {
      await db.delete(elementPossessions).where(eq(elementPossessions.characterId, testCharacterId));
      await db.delete(characters).where(eq(characters.id, testCharacterId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (duplicateElementId) {
      await db.delete(systemElements).where(eq(systemElements.id, duplicateElementId));
    }
    if (testElementId) {
      await db.delete(systemElements).where(eq(systemElements.id, testElementId));
    }
  });

  it('executes full create -> assign -> propagate -> edit -> propagate -> duplicate -> delete lifecycle', async () => {
    // Ensure system_mechanics rule exists in the database
    const { getRule, upsertRule } = await import('../rules.ts');
    const { createCoreCategories } = await import('../../domain/coreRuleCatalog.ts');
    let mechanicsRule = await getRule('system_mechanics');
    if (!mechanicsRule || !Array.isArray(mechanicsRule.value) || mechanicsRule.value.length === 0) {
      mechanicsRule = await upsertRule('system_mechanics', 'config', createCoreCategories(), 'Reglas mecánicas del sistema');
    }
    const mechanicsConfig = mechanicsRule.value as any[];
    const category = mechanicsConfig.find((c: any) => c.rules && c.rules.length > 0) || mechanicsConfig[0];
    const rule = category.rules[0];

    // STEP 1: CREATE TEST ELEMENT
    const created = await upsertElement({
      kind: 'skill',
      name: 'TEMP Combate Marcial',
      description: 'Habilidad de combate cuerpo a cuerpo.',
      status: 'draft',
      effects: [
        {
          applicationId: nanoid(),
          groupId: 'Principal',
          mechanicId: category.id,
          ruleId: rule.id,
          minLevel: 3,
        },
      ],
      requirements: { operator: 'all', requirements: [] },
      metadata: {
        baseExpCost: 75,
        maxLevel: 5,
      },
    });

    testElementId = created.id;
    expect(testElementId).toBeDefined();

    // Verify element was persisted properly
    const loadedElement = await getElement(testElementId);
    expect(loadedElement).toBeDefined();
    expect(loadedElement.name).toBe('TEMP Combate Marcial');
    expect((loadedElement.effects as any[])[0].minLevel).toBe(3);
    expect((loadedElement.metadata as any).baseExpCost).toBe(75);

    // STEP 2: ASSIGN ELEMENT TO CHARACTER
    const [possession] = await db.insert(elementPossessions).values({
      id: nanoid(10),
      characterId: testCharacterId,
      elementId: testElementId,
      quantity: 1,
      selectedChoices: { level: 3 },
    }).returning();
    expect(possession.id).toBeDefined();

    // STEP 3: VERIFY PROPAGATION TO CHARACTER SHEET
    const allChars = await getCharactersWithPossessions();
    const characterWithPossessions = allChars.find((c) => c.id === testCharacterId);
    expect(characterWithPossessions).toBeDefined();
    
    const assignedRow = characterWithPossessions?.possessions.find((p) => p.element?.id === testElementId);
    expect(assignedRow).toBeDefined();
    expect((assignedRow?.possession.selectedChoices as any)?.level).toBe(3);
    expect(assignedRow?.element?.name).toBe('TEMP Combate Marcial');
    expect(assignedRow?.element?.description).toBe('Habilidad de combate cuerpo a cuerpo.');
    expect((assignedRow?.element?.effects as any[])[0].minLevel).toBe(3);

    // STEP 4: EDIT ELEMENT IN CATALOG
    const updated = await upsertElement({
      id: testElementId,
      name: 'TEMP Combate Marcial (Maestría)',
      description: 'Habilidad de combate con técnicas avanzadas modificadas.',
      metadata: {
        baseExpCost: 90,
        maxLevel: 5,
        notes: 'Actualizado con éxito',
      },
    });
    expect(updated.name).toBe('TEMP Combate Marcial (Maestría)');

    // STEP 5: VERIFY PROPAGATION OF EDIT TO CHARACTER SHEET
    const reloadedChars = await getCharactersWithPossessions();
    const reloadedCharacter = reloadedChars.find((c) => c.id === testCharacterId);
    const reloadedRow = reloadedCharacter?.possessions.find((p) => p.element?.id === testElementId);
    expect(reloadedRow).toBeDefined();
    expect(reloadedRow?.element?.name).toBe('TEMP Combate Marcial (Maestría)');
    expect(reloadedRow?.element?.description).toBe('Habilidad de combate con técnicas avanzadas modificadas.');
    expect((reloadedRow?.element?.metadata as any)?.baseExpCost).toBe(90);
    expect((reloadedRow?.possession.selectedChoices as any)?.level).toBe(3);

    // STEP 6: DUPLICATE ELEMENT
    const { id: _id, createdAt: _c, updatedAt: _u, ...elementData } = updated;
    const duplicated = await upsertElement({
      ...elementData,
      name: `${updated.name} (Copia)`,
      status: 'draft',
      effects: (updated.effects as any[]).map((eff: any) => ({
        ...eff,
        applicationId: nanoid(),
      })),
    });
    duplicateElementId = duplicated.id;
    expect(duplicateElementId).toBeDefined();
    expect(duplicateElementId).not.toBe(testElementId);
    expect(duplicated.name).toBe('TEMP Combate Marcial (Maestría) (Copia)');
    expect(duplicated.status).toBe('draft');
    expect((duplicated.metadata as any).baseExpCost).toBe(90);

    // STEP 7: VERIFY DELETION SAFEGUARD (Cannot delete while character possesses it)
    await expect(deleteElement(testElementId)).rejects.toThrow();

    // STEP 8: REMOVE POSSESSION AND DELETE
    await db.delete(elementPossessions).where(eq(elementPossessions.characterId, testCharacterId));
    
    // Now deletion of original test element succeeds
    await deleteElement(testElementId);
    const deletedOriginal = await getElement(testElementId);
    expect(deletedOriginal).toBeUndefined();
    testElementId = '';

    // Delete duplicate test element
    await deleteElement(duplicateElementId);
    const deletedDuplicate = await getElement(duplicateElementId);
    expect(deletedDuplicate).toBeUndefined();
    duplicateElementId = '';
  });

  it('persists item equipment state (equipped: true) across save, reload, and toggle', async () => {
    const { saveCharacterWithElementSelections, toggleCharacterPossessionEquip, getCharacterPossessions } = await import('../characters.ts');

    // 1. Create a published equipment element
    const testItem = await upsertElement({
      name: 'TEMP Botas Reforzadas Test',
      kind: 'equipment',
      status: 'published',
      description: 'Botas de prueba con +1 Evasión.',
      mechanicalBehaviors: [
        {
          id: 'beh_test_boots',
          name: 'Agilidad',
          mode: 'continuous',
          conditions: [{ type: 'equipped' }],
          effects: [{ id: 'eff_eva_1', type: 'derived_stat_modifier', statId: 'EVA', amount: 1 }]
        }
      ]
    });
    testElementId = testItem.id;

    // 2. Save character with equipped item
    await saveCharacterWithElementSelections({
      characterId: testCharacterId,
      name: 'Personaje Test Equip',
      profileData: {},
      inventoryPossessions: [
        {
          elementId: testItem.id,
          quantity: 1,
          equipped: true,
          notes: 'Botas equipadas'
        }
      ],
      actorUid: 'test_lifecycle_actor'
    });

    // 3. Reload character possessions and verify equipped === true
    let possessions = await getCharacterPossessions(testCharacterId);
    let itemPossession = possessions.find(p => p.possession.elementId === testItem.id);
    expect(itemPossession).toBeDefined();
    expect(itemPossession?.possession.equipped).toBe(true);

    // 4. Toggle unequip
    await toggleCharacterPossessionEquip(testCharacterId, testItem.id, false, 'test_lifecycle_actor');
    possessions = await getCharacterPossessions(testCharacterId);
    itemPossession = possessions.find(p => p.possession.elementId === testItem.id);
    expect(itemPossession?.possession.equipped).toBe(false);

    // 5. Toggle equip again
    await toggleCharacterPossessionEquip(testCharacterId, testItem.id, true, 'test_lifecycle_actor');
    possessions = await getCharacterPossessions(testCharacterId);
    itemPossession = possessions.find(p => p.possession.elementId === testItem.id);
    expect(itemPossession?.possession.equipped).toBe(true);

    // Cleanup possession & element
    await db.delete(elementPossessions).where(eq(elementPossessions.characterId, testCharacterId));
    await deleteElement(testItem.id);
    testElementId = '';
  });
});

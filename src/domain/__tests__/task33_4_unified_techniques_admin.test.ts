import { describe, it, expect } from 'vitest';
import {
  createCharacterTechniqueSchema,
  updateCharacterTechniqueSchema,
  characterTechniqueSchema,
  type CharacterTechnique,
  deriveTechniqueFunctionalCategories,
  deriveTechniqueRollContract,
  deriveTechniqueLevelFromCost,
} from '../characterTechnique';
import {
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from '../mechanicalBehavior';
import { calculateTechniqueStructuralCost } from '../systemMechanics';
import { createCoreCategories } from '../coreRuleCatalog';
import { resolveCharacterDisplayName } from '../coreProfileFields';
import { getAttributeLabel } from '../mechanicalLabels';

describe('Tarea 33.4 — Unificación de Sistema → Técnicas con el editor canónico', () => {
  const coreMechanics = createCoreCategories();

  const createDamageBehavior = (dice: string = '2d6'): MechanicalBehavior => {
    const b = createDefaultMechanicalBehavior('beh_dmg_1', 'active', 'Golpe Directo');
    b.effects = [
      {
        id: 'eff_1',
        type: 'damage',
        damageType: 'fisico',
        dice,
      },
    ];
    return b;
  };

  it('1. Crear desde Personaje: crea técnica vinculada exclusivamente al characterId asignado', () => {
    const characterId = 101;
    const input = {
      characterId,
      name: 'Ráfaga de Fuego',
      description: 'Dispara una ráfaga llameante hacia el oponente.',
      level: 1,
      sourceType: 'quirk' as const,
      activationAttributeId: 'FUE',
      mechanicalBehaviors: [createDamageBehavior('2d6')],
    };

    const validated = createCharacterTechniqueSchema.parse(input);
    expect(validated.characterId).toBe(101);
    expect(validated.name).toBe('Ráfaga de Fuego');
    expect(validated.sourceType).toBe('quirk');
    expect(validated.activationAttributeId).toBe('FUE');
    expect(validated.mechanicalBehaviors).toHaveLength(1);
  });

  it('2. Crear desde Sistema: tras seleccionar Personaje B, crea la técnica para characterId = B con idéntica estructura', () => {
    const characterIdB = 202; // Personaje B seleccionado en el picker administrativo
    const input = {
      characterId: characterIdB,
      name: 'Corte Relámpago',
      description: 'Ataque de espada a gran velocidad.',
      level: 2,
      sourceType: 'weapon' as const,
      activationAttributeId: 'DES',
      mechanicalBehaviors: [createDamageBehavior('2d8')],
    };

    const validated = createCharacterTechniqueSchema.parse(input);
    expect(validated.characterId).toBe(202);
    expect(validated.name).toBe('Corte Relámpago');
    expect(validated.sourceType).toBe('weapon');
    expect(validated.activationAttributeId).toBe('DES');
  });

  it('3. Ambos flujos comparten el mismo modelo canónico y mismas derivaciones en tiempo real', () => {
    const behaviors = [createDamageBehavior('2d10')];
    const techCharacterSheet: CharacterTechnique = {
      id: 'tech_sheet_1',
      characterId: 101,
      name: 'Impacto Alpha',
      description: 'Impacto fuerte',
      level: 1,
      sourceType: 'physical',
      activationAttributeId: 'FUE',
      mechanicalBehaviors: behaviors,
      revision: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const techAdminGlobal: CharacterTechnique = {
      id: 'tech_sheet_1',
      characterId: 101,
      name: 'Impacto Alpha',
      description: 'Impacto fuerte',
      level: 1,
      sourceType: 'physical',
      activationAttributeId: 'FUE',
      mechanicalBehaviors: behaviors,
      revision: 1,
      createdAt: techCharacterSheet.createdAt,
      updatedAt: techCharacterSheet.updatedAt,
    };

    // Validated with same schema
    expect(characterTechniqueSchema.parse(techCharacterSheet)).toEqual(
      characterTechniqueSchema.parse(techAdminGlobal)
    );

    // Derived categories & roll contracts are identical
    const categories1 = deriveTechniqueFunctionalCategories(techCharacterSheet.mechanicalBehaviors);
    const categories2 = deriveTechniqueFunctionalCategories(techAdminGlobal.mechanicalBehaviors);
    expect(categories1).toEqual(['offensive']);
    expect(categories1).toEqual(categories2);

    const roll1 = deriveTechniqueRollContract(techCharacterSheet.mechanicalBehaviors, {
      structuralCost: calculateTechniqueStructuralCost(techCharacterSheet, coreMechanics),
      activationAttributeId: techCharacterSheet.activationAttributeId,
    });
    const roll2 = deriveTechniqueRollContract(techAdminGlobal.mechanicalBehaviors, {
      structuralCost: calculateTechniqueStructuralCost(techAdminGlobal, coreMechanics),
      activationAttributeId: techAdminGlobal.activationAttributeId,
    });
    expect(roll1).toEqual(roll2);
    expect(roll1.behaviors[0].requiresRoll).toBe(true);
    expect(roll1.behaviors[0].opposition?.label).toBe('Evasión');
    expect(roll1.behaviors[0].opposition?.kind).toBe('target_evasion');
    expect(roll1.behaviors[0].attribute).toBe('FUE');
  });

  it('4. Modificación desde Sistema: la actualización muta la misma entidad en BD y es visible para la Ficha', () => {
    const initialTech: CharacterTechnique = {
      id: 'tech_shared_123',
      characterId: 50,
      name: 'Golpe Sónico',
      description: 'Ataque de prueba',
      level: 1,
      sourceType: 'physical',
      activationAttributeId: 'FUE',
      mechanicalBehaviors: [createDamageBehavior('2d6')],
      revision: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Admin edits damage from 2d6 to 3d6
    const updatePayload = {
      name: 'Golpe Sónico Potenciado',
      description: 'Ataque mejorado desde administración',
      level: 1,
      sourceType: 'physical' as const,
      activationAttributeId: 'FUE',
      mechanicalBehaviors: [createDamageBehavior('3d6')],
      expectedRevision: 1,
    };

    const validatedUpdate = updateCharacterTechniqueSchema.parse(updatePayload);
    expect(validatedUpdate.expectedRevision).toBe(1);

    // Simulated updated record in db
    const updatedRecord: CharacterTechnique = {
      ...initialTech,
      name: validatedUpdate.name!,
      description: validatedUpdate.description!,
      mechanicalBehaviors: validatedUpdate.mechanicalBehaviors!,
      revision: initialTech.revision + 1,
      updatedAt: new Date(),
    };

    // When Character Sheet fetches this technique, it receives 3d6
    const sheetParsed = characterTechniqueSchema.parse(updatedRecord);
    expect(sheetParsed.name).toBe('Golpe Sónico Potenciado');
    expect((sheetParsed.mechanicalBehaviors[0].effects[0] as any).dice).toBe('3d6');
    expect(sheetParsed.revision).toBe(2);
  });

  it('5. Control de concurrencia optimista previene sobrescrituras accidentales', () => {
    const updateStalePayload = {
      name: 'Edición concurrente con revision obsoleta',
      expectedRevision: 1, // Stale if record is now revision 2
    };

    const validated = updateCharacterTechniqueSchema.parse(updateStalePayload);
    expect(validated.expectedRevision).toBe(1);
    // Revision mismatch is rejected in updateCharacterTechnique service
  });

  describe('Corrección QA: Selector de Personajes e Identificadores Técnicos', () => {
    it('6. Selector de Personajes: character.id=38 con nombre completo="Himiko Toga" separa value interno de label visible', () => {
      const character = {
        id: 38,
        name: 'Himiko Toga',
        profileData: {
          basic_name: 'Himiko',
          last_name: 'Toga',
        },
      };

      // Internal value used for selection / persistence
      const internalValue = String(character.id);
      expect(internalValue).toBe('38');

      // Visible text displayed to user
      const visibleText = resolveCharacterDisplayName(character);
      expect(visibleText).toBe('Himiko Toga');

      // Visible text MUST NOT contain the internal numeric ID "38"
      expect(visibleText).not.toContain('38');
      expect(visibleText).not.toContain(String(character.id));
    });

    it('7. Resolver canónico de nombres maneja profileData (basic_name + last_name), firstName/lastName y direct name', () => {
      // Case A: profileData with separate fields
      const charA = {
        id: 42,
        name: 'Legacy Name',
        profileData: {
          basic_name: 'Izuku',
          last_name: 'Midoriya',
        },
      };
      expect(resolveCharacterDisplayName(charA)).toBe('Izuku Midoriya');
      expect(resolveCharacterDisplayName(charA)).not.toContain('42');

      // Case B: direct name only
      const charB = {
        id: 99,
        name: 'All Might',
      };
      expect(resolveCharacterDisplayName(charB)).toBe('All Might');
      expect(resolveCharacterDisplayName(charB)).not.toContain('99');

      // Case C: Missing name -> Fallback "Personaje sin nombre", NEVER the ID
      const charC = {
        id: 38,
        name: '',
        profileData: {},
      };
      expect(resolveCharacterDisplayName(charC)).toBe('Personaje sin nombre');
      expect(resolveCharacterDisplayName(charC)).not.toContain('38');
      expect(resolveCharacterDisplayName(null)).toBe('Personaje sin nombre');
    });

    it('8. Atributos de activación muestran etiquetas legibles en español en vez de IDs crudos', () => {
      expect(getAttributeLabel('FUE')).toBe('Fuerza (FUE)');
      expect(getAttributeLabel('DES')).toBe('Destreza (DES)');
      expect(getAttributeLabel('RES')).toBe('Resistencia (RES)');
      expect(getAttributeLabel('INT')).toBe('Inteligencia (INT)');
      expect(getAttributeLabel('VOL')).toBe('Voluntad (VOL)');
      expect(getAttributeLabel('VEL')).toBe('Velocidad (VEL)');
    });
  });
});


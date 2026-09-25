import { describe, it, expect } from 'vitest';
import {
  characterTechniqueSchema,
  createCharacterTechniqueSchema,
  updateCharacterTechniqueSchema,
  deriveTechniqueRollContract,
  deriveTechniqueFunctionalCategories,
  deriveEffectiveBehaviorResolution,
  type CharacterTechnique,
} from '../characterTechnique';
import {
  deriveSupportDefenseRD,
  DEFAULT_SUPPORT_DIFFICULTY_TIERS,
  type SupportDifficultyTier,
} from '../systemMechanics';
import {
  getMechanicalLabel,
  getTechniqueClassificationLabel,
  MECHANICAL_LABELS,
} from '../mechanicalLabels';
import { type MechanicalBehavior } from '../mechanicalBehavior';

function createMockBehavior(partial: Partial<MechanicalBehavior> = {}): MechanicalBehavior {
  return {
    id: partial.id || 'beh_test_1',
    name: partial.name ?? 'Comportamiento de prueba',
    mode: partial.mode ?? 'active',
    conditions: partial.conditions ?? [],
    conditionLogic: partial.conditionLogic ?? 'all',
    limitations: partial.limitations ?? [],
    effects: partial.effects ?? [],
    resolution: partial.resolution,
    target: partial.target,
    activation: partial.activation,
    trigger: partial.trigger,
    temporality: partial.temporality,
    control: partial.control,
  };
}

describe('Technique Explicit Classification & Automatic RD Derivation', () => {
  // 1 & 2: Domain & API Schemas validate and preserve classification
  it('1. Una técnica puede persistir classification: "support"', () => {
    const techInput = {
      id: 'tech_support_1',
      characterId: 38,
      name: 'Copycat',
      description: 'Copia forma',
      level: 1,
      sourceType: 'quirk' as const,
      classification: 'support' as const,
      activationAttributeId: 'RES',
      mechanicalBehaviors: [],
      revision: 1,
    };

    const parsed = characterTechniqueSchema.parse(techInput);
    expect(parsed.classification).toBe('support');
  });

  it('2. La API conserva correctamente la clasificación (create & update schemas)', () => {
    const createInput = {
      characterId: 10,
      name: 'Escudo Cinético',
      sourceType: 'physical' as const,
      classification: 'defensive' as const,
    };
    const parsedCreate = createCharacterTechniqueSchema.parse(createInput);
    expect(parsedCreate.classification).toBe('defensive');

    const updateInput = {
      classification: 'control' as const,
    };
    const parsedUpdate = updateCharacterTechniqueSchema.parse(updateInput);
    expect(parsedUpdate.classification).toBe('control');
  });

  // 3: UI labels in Spanish
  it('3. La UI presenta las cuatro clasificaciones en español sin IDs técnicos', () => {
    expect(getTechniqueClassificationLabel('offensive')).toBe('Ofensiva');
    expect(getTechniqueClassificationLabel('support')).toBe('Soporte');
    expect(getTechniqueClassificationLabel('defensive')).toBe('Defensiva');
    expect(getTechniqueClassificationLabel('control')).toBe('Control');

    expect(getMechanicalLabel('techniqueClassifications', 'offensive')).toBe('Ofensiva');
    expect(getMechanicalLabel('techniqueClassifications', 'support')).toBe('Soporte');
    expect(getMechanicalLabel('techniqueClassifications', 'defensive')).toBe('Defensiva');
    expect(getMechanicalLabel('techniqueClassifications', 'control')).toBe('Control');

    expect(MECHANICAL_LABELS.techniqueClassifications).toEqual({
      offensive: 'Ofensiva',
      support: 'Soporte',
      defensive: 'Defensiva',
      control: 'Control',
    });
  });

  // 4 & 5: Support technique derives RD from structural cost
  it('4. Una técnica support con CE 2 deriva Normal / RD 12', () => {
    const behavior = createMockBehavior({
      resolution: { type: 'rd', attribute: 'RES' },
    });
    const contract = deriveTechniqueRollContract([behavior], {
      structuralCost: 2,
      classification: 'support',
      activationAttributeId: 'RES',
    });

    expect(contract.behaviors[0].requiresRoll).toBe(true);
    expect(contract.behaviors[0].opposition?.derivedDifficulty).toBe(12);
    expect(contract.behaviors[0].opposition?.label).toBe('RD 12');
    expect(contract.behaviors[0].rollFormula).toBe('2D10 + RES vs. RD 12');
  });

  it('5. Una técnica support con CE 4 deriva Complicado / RD 16', () => {
    const behavior = createMockBehavior({
      resolution: { type: 'rd', attribute: 'RES' },
    });
    const contract = deriveTechniqueRollContract([behavior], {
      structuralCost: 4,
      classification: 'support',
      activationAttributeId: 'RES',
    });

    expect(contract.behaviors[0].requiresRoll).toBe(true);
    expect(contract.behaviors[0].opposition?.derivedDifficulty).toBe(16);
    expect(contract.behaviors[0].opposition?.label).toBe('RD 16');
    expect(contract.behaviors[0].rollFormula).toBe('2D10 + RES vs. RD 16');
  });

  // 6: Defensive technique uses same system
  it('6. Una técnica defensive utiliza el mismo sistema de RD', () => {
    const behavior = createMockBehavior({
      resolution: { type: 'rd', attribute: 'RES' },
    });
    const contractLow = deriveTechniqueRollContract([behavior], {
      structuralCost: 3,
      classification: 'defensive',
      activationAttributeId: 'RES',
    });
    expect(contractLow.behaviors[0].opposition?.derivedDifficulty).toBe(12);

    const contractMid = deriveTechniqueRollContract([behavior], {
      structuralCost: 6,
      classification: 'defensive',
      activationAttributeId: 'RES',
    });
    expect(contractMid.behaviors[0].opposition?.derivedDifficulty).toBe(16);

    const contractHigh = deriveTechniqueRollContract([behavior], {
      structuralCost: 8,
      classification: 'defensive',
      activationAttributeId: 'RES',
    });
    expect(contractHigh.behaviors[0].opposition?.derivedDifficulty).toBe(20);
  });

  // 7: Offensive technique does NOT receive support RD
  it('7. Una técnica offensive no recibe RD automático de soporte (deriva Evasión/Coraje)', () => {
    const behavior = createMockBehavior({
      effects: [{ id: 'e1', type: 'damage', damageType: 'fisico' } as any],
    });
    const contract = deriveTechniqueRollContract([behavior], {
      structuralCost: 2,
      classification: 'offensive',
      activationAttributeId: 'FUE',
    });

    expect(contract.behaviors[0].requiresRoll).toBe(true);
    expect(contract.behaviors[0].resolutionType).toBe('roll');
    expect(contract.behaviors[0].opposition?.targetDefense).toBe('EVA');
    expect(contract.behaviors[0].opposition?.label).toBe('Evasión');
  });

  // 8: Control technique does NOT receive support RD
  it('8. Una técnica control no recibe RD automático de soporte (deriva automática por defecto)', () => {
    const behavior = createMockBehavior({
      effects: [{ id: 'e1', type: 'turn_loss', turns: 1 } as any],
    });
    const contract = deriveTechniqueRollContract([behavior], {
      structuralCost: 2,
      classification: 'control',
      activationAttributeId: 'INT',
    });

    expect(contract.behaviors[0].requiresRoll).toBe(false);
    expect(contract.behaviors[0].resolutionType).toBe('automatic');
    expect(contract.behaviors[0].opposition).toBeUndefined();
  });

  // 9: Transformation does NOT automatically imply support
  it('9. transformation no implica automáticamente support', () => {
    const behavior = createMockBehavior({
      effects: [
        {
          id: 'e1',
          type: 'transformation',
          magnitude: { type: 'body', value: 1 },
          temporality: { duration: { type: 'turns', value: 5 } },
        } as any,
      ],
    });

    const derivedCategories = deriveTechniqueFunctionalCategories([behavior]);
    expect(derivedCategories).toEqual([]);
    expect(derivedCategories.includes('support')).toBe(false);
  });

  // 10: Support technique with transformation DOES obtain RD via explicit classification
  it('10. Una técnica support con transformation sí obtiene RD por su clasificación explícita', () => {
    const tech: CharacterTechnique = {
      id: 'copycat_test',
      characterId: 38,
      name: 'Copycat',
      description: 'Transformación corporal',
      level: 1,
      sourceType: 'quirk',
      classification: 'support',
      activationAttributeId: 'RES',
      mechanicalBehaviors: [
        createMockBehavior({
          id: 'beh_copycat',
          effects: [
            {
              id: 'e_tf',
              type: 'transformation',
              magnitude: { type: 'body', value: 1 },
              temporality: { duration: { type: 'turns', value: 5 } },
            } as any,
          ],
          resolution: { type: 'rd', attribute: 'RES' },
        }),
      ],
      revision: 1,
    };

    const contract = deriveTechniqueRollContract(tech, {
      structuralCost: 2,
    });

    expect(contract.behaviors[0].requiresRoll).toBe(true);
    expect(contract.behaviors[0].opposition?.kind).toBe('support_defense_rd');
    expect(contract.behaviors[0].opposition?.derivedDifficulty).toBe(12);
    expect(contract.behaviors[0].opposition?.label).toBe('RD 12');
  });

  // 11: DB configured tiers resolve correctly against system_difficulty
  it('11. Los tiers configurados en BD resuelven contra system_difficulty correctamente', () => {
    const dbTiers: SupportDifficultyTier[] = [
      { maxCost: 3, difficultyId: 'Normal' },
      { maxCost: 6, difficultyId: 'Complicado' },
      { maxCost: 10, difficultyId: 'Difícil' },
      { maxCost: 99, difficultyId: 'Muy Difícil' },
    ];

    expect(deriveSupportDefenseRD(1, dbTiers)).toBe(12);
    expect(deriveSupportDefenseRD(2, dbTiers)).toBe(12);
    expect(deriveSupportDefenseRD(3, dbTiers)).toBe(12);
    expect(deriveSupportDefenseRD(4, dbTiers)).toBe(16);
    expect(deriveSupportDefenseRD(6, dbTiers)).toBe(16);
    expect(deriveSupportDefenseRD(7, dbTiers)).toBe(20);
    expect(deriveSupportDefenseRD(10, dbTiers)).toBe(20);
    expect(deriveSupportDefenseRD(11, dbTiers)).toBe(24);
  });

  // 12: No incorrect fallback to RD 24 for Normal
  it('12. No existe fallback incorrecto a RD 24 para Normal', () => {
    const dbTiers: SupportDifficultyTier[] = [
      { maxCost: 3, difficultyId: 'Normal' },
    ];

    expect(deriveSupportDefenseRD(0, dbTiers)).toBe(12);
    expect(deriveSupportDefenseRD(2, dbTiers)).toBe(12);
    expect(deriveSupportDefenseRD(3, dbTiers)).toBe(12);
    expect(deriveSupportDefenseRD(2, dbTiers)).not.toBe(24);
  });

  // 13: Legacy techniques without classification load safely
  it('13. Técnicas antiguas sin clasificación no rompen carga/hidratación', () => {
    const legacyJson = {
      id: 'legacy_1',
      characterId: 1,
      name: 'Técnica Antigua',
      level: 1,
      sourceType: 'physical',
      // classification missing or null
      activationAttributeId: 'FUE',
      mechanicalBehaviors: [],
    };

    const parsed = characterTechniqueSchema.parse(legacyJson);
    expect(parsed.classification).toBeUndefined();

    // Deriving roll contract gracefully falls back to behavior analysis
    const contract = deriveTechniqueRollContract(parsed, { structuralCost: 2 });
    expect(contract.hasRoll).toBe(false);
  });

  // 14: Changing structural cost updates derived RD
  it('14. Cambiar el coste estructural actualiza el RD derivado', () => {
    const behavior = createMockBehavior({
      resolution: { type: 'rd', attribute: 'RES' },
    });

    const c1 = deriveTechniqueRollContract([behavior], {
      structuralCost: 2,
      classification: 'support',
      activationAttributeId: 'RES',
    });
    expect(c1.behaviors[0].opposition?.derivedDifficulty).toBe(12);

    const c2 = deriveTechniqueRollContract([behavior], {
      structuralCost: 5,
      classification: 'support',
      activationAttributeId: 'RES',
    });
    expect(c2.behaviors[0].opposition?.derivedDifficulty).toBe(16);

    const c3 = deriveTechniqueRollContract([behavior], {
      structuralCost: 9,
      classification: 'support',
      activationAttributeId: 'RES',
    });
    expect(c3.behaviors[0].opposition?.derivedDifficulty).toBe(20);

    const c4 = deriveTechniqueRollContract([behavior], {
      structuralCost: 15,
      classification: 'support',
      activationAttributeId: 'RES',
    });
    expect(c4.behaviors[0].opposition?.derivedDifficulty).toBe(24);
  });

  // 15: Explicit classification takes precedence over inferred
  it('15. La clasificación explícita tiene precedencia sobre la inferida', () => {
    // Behavior has healing effect (which infer would mark as 'support')
    const healingBehavior = createMockBehavior({
      effects: [{ id: 'e1', type: 'healing', amount: 5 } as any],
    });

    // Inferred alone is support
    expect(deriveTechniqueFunctionalCategories([healingBehavior])).toEqual(['support']);

    // Explicitly set to 'control'
    const resControl = deriveEffectiveBehaviorResolution(healingBehavior, {
      classification: 'control',
      structuralCost: 2,
    });
    // Control does NOT derive support RD
    expect(resControl.type).toBe('automatic');
    expect(resControl.oppositionKind).toBeUndefined();

    // Explicitly set to 'defensive'
    const resDefensive = deriveEffectiveBehaviorResolution(healingBehavior, {
      classification: 'defensive',
      structuralCost: 2,
    });
    expect(resDefensive.type).toBe('rd');
    expect(resDefensive.difficulty).toBe(12);
    expect(resDefensive.oppositionKind).toBe('support_defense_rd');
  });
});

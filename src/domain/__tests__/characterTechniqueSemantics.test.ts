import { describe, it, expect } from 'vitest';
import {
  deriveTechniqueFunctionalCategories,
  deriveTechniqueRollContract,
  type CharacterTechnique,
} from '../characterTechnique';
import type { MechanicalBehavior } from '../mechanicalBehavior';

function createBehavior(partial: Partial<MechanicalBehavior> & { id: string }): MechanicalBehavior {
  return {
    id: partial.id,
    name: partial.name ?? `Behavior ${partial.id}`,
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

describe('CharacterTechnique Semantics: Functional Classification (Part A)', () => {
  const createMockTechnique = (
    behaviors: MechanicalBehavior[],
    sourceType: 'quirk' | 'physical' | 'weapon' = 'quirk'
  ): CharacterTechnique => ({
    id: 'tech_test_1',
    characterId: 101,
    name: 'Técnica de Prueba',
    description: 'Descripción de prueba',
    level: 1,
    sourceType,
    mechanicalBehaviors: behaviors,
    revision: 1,
  });

  it('A. classifies damage effect as offensive', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'damage',
          dice: '2d6',
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['offensive']);
  });

  it('B. classifies penalty effect as offensive', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'penalty',
          targetStat: 'eva',
          amount: 2,
          operation: 'add',
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['offensive']);
  });

  it('C. classifies healing effect as support', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'healing',
          resourceId: 'SA',
          amount: 15,
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['support']);
  });

  it('D. classifies bonus effect as support', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'bonus',
          targetStat: 'ini',
          amount: 2,
          operation: 'add',
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['support']);
  });

  it('E. classifies barrier effect as defensive', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'barrier',
          amount: 20,
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['defensive']);
  });

  it('F. classifies status_apply effect as control', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'status_apply',
          statusElementId: 'aturdido',
          turns: 1,
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['control']);
  });

  it('G. classifies turn_loss effect as control', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'turn_loss',
          turns: 1,
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['control']);
  });

  it('H. classifies action_block and effect_block effects as control', () => {
    const behaviorActionBlock = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'action_block',
          blockedAction: 'movement',
          duration: 1,
        },
      ],
    });
    const behaviorEffectBlock = createBehavior({
      id: 'b2',
      effects: [
        {
          id: 'eff_2',
          type: 'effect_block',
          scope: 'healing',
        },
      ],
    });
    expect(deriveTechniqueFunctionalCategories([behaviorActionBlock])).toEqual(['control']);
    expect(deriveTechniqueFunctionalCategories([behaviorEffectBlock])).toEqual(['control']);
  });

  it('I. combines damage + status_apply into offensive + control', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'damage',
          dice: '1d10',
        },
        {
          id: 'eff_2',
          type: 'status_apply',
          statusElementId: 'quemadura',
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['offensive', 'control']);
  });

  it('J. combines healing + barrier into support + defensive', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        {
          id: 'eff_1',
          type: 'healing',
          resourceId: 'SA',
          amount: 10,
        },
        {
          id: 'eff_2',
          type: 'barrier',
          amount: 15,
        },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['support', 'defensive']);
  });

  it('K. deduplicates multiple effects of the same category', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        { id: 'eff_1', type: 'damage', dice: '1d6' },
        { id: 'eff_2', type: 'damage', dice: '2d6' },
        { id: 'eff_3', type: 'penalty', targetStat: 'eva', amount: 1, operation: 'add' },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['offensive']);
  });

  it('L. preserves canonical category ordering: [offensive, support, defensive, control]', () => {
    // Input order is intentionally reverse canonical
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        { id: 'eff_1', type: 'action_block', blockedAction: 'movement', duration: 1 }, // control
        { id: 'eff_2', type: 'barrier', amount: 10 },                                  // defensive
        { id: 'eff_3', type: 'healing', resourceId: 'SA', amount: 5 },                // support
        { id: 'eff_4', type: 'damage', dice: '3d6' },                                  // offensive
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual(['offensive', 'support', 'defensive', 'control']);
  });

  it('M. returns empty array for empty behaviors', () => {
    expect(deriveTechniqueFunctionalCategories([])).toEqual([]);
    expect(deriveTechniqueFunctionalCategories(createMockTechnique([]))).toEqual([]);
  });

  it('N. leaves ambiguous/unclassified mechanics unclassified and never invents "utility"', () => {
    const behavior = createBehavior({
      id: 'b1',
      effects: [
        { id: 'eff_1', type: 'resource_modifier', resourceId: 'ES', amount: 5, operation: 'add' },
        { id: 'eff_2', type: 'cost_modifier', scopeId: 'technique', amount: -2, operation: 'add' },
        { id: 'eff_3', type: 'counter_modifier', counterId: 'heat', operation: 'increment', value: 1 },
        { id: 'eff_4', type: 'inventory_consume', elementId: 'item_1', quantity: 1 },
        { id: 'eff_5', type: 'manual', message: 'Narrative lighting effect' },
      ],
    });
    const categories = deriveTechniqueFunctionalCategories([behavior]);
    expect(categories).toEqual([]);
    expect(categories).not.toContain('utility');
  });

  it('O. sourceType does not affect category derivation', () => {
    const behaviors: MechanicalBehavior[] = [
      createBehavior({
        id: 'b1',
        effects: [{ id: 'e1', type: 'damage', dice: '2d8' }],
      }),
    ];

    const quirkTech = createMockTechnique(behaviors, 'quirk');
    const physicalTech = createMockTechnique(behaviors, 'physical');
    const weaponTech = createMockTechnique(behaviors, 'weapon');

    expect(deriveTechniqueFunctionalCategories(quirkTech)).toEqual(['offensive']);
    expect(deriveTechniqueFunctionalCategories(physicalTech)).toEqual(['offensive']);
    expect(deriveTechniqueFunctionalCategories(weaponTech)).toEqual(['offensive']);
  });

  it('P. classifies directional incoming/outgoing modifiers only when semantics justify it', () => {
    // Outgoing damage: +2 increases damage => offensive
    const outgoingDmgBoost = createBehavior({
      id: 'b1',
      mode: 'continuous',
      effects: [{ id: 'e1', type: 'outgoing_damage_modifier', amount: 2, operation: 'add' }],
    });
    expect(deriveTechniqueFunctionalCategories([outgoingDmgBoost])).toEqual(['offensive']);

    // Outgoing damage: -2 decreases damage => NOT offensive
    const outgoingDmgPenalty = createBehavior({
      id: 'b2',
      mode: 'continuous',
      effects: [{ id: 'e2', type: 'outgoing_damage_modifier', amount: -2, operation: 'add' }],
    });
    expect(deriveTechniqueFunctionalCategories([outgoingDmgPenalty])).toEqual([]);

    // Incoming damage: subtract 5 or add -5 reduces incoming damage => defensive
    const incomingDmgReductionSub = createBehavior({
      id: 'b3',
      mode: 'continuous',
      effects: [{ id: 'e3', type: 'incoming_damage_modifier', amount: 5, operation: 'subtract' }],
    });
    const incomingDmgReductionAddNeg = createBehavior({
      id: 'b4',
      mode: 'continuous',
      effects: [{ id: 'e4', type: 'incoming_damage_modifier', amount: -5, operation: 'add' }],
    });
    const incomingDmgReductionMult = createBehavior({
      id: 'b5',
      mode: 'continuous',
      effects: [{ id: 'e5', type: 'incoming_damage_modifier', amount: 0.5, operation: 'multiply' }],
    });
    expect(deriveTechniqueFunctionalCategories([incomingDmgReductionSub])).toEqual(['defensive']);
    expect(deriveTechniqueFunctionalCategories([incomingDmgReductionAddNeg])).toEqual(['defensive']);
    expect(deriveTechniqueFunctionalCategories([incomingDmgReductionMult])).toEqual(['defensive']);

    // Incoming damage: add +5 increases incoming damage (vulnerability) => NOT defensive
    const incomingDmgIncrease = createBehavior({
      id: 'b6',
      mode: 'continuous',
      effects: [{ id: 'e6', type: 'incoming_damage_modifier', amount: 5, operation: 'add' }],
    });
    expect(deriveTechniqueFunctionalCategories([incomingDmgIncrease])).toEqual([]);

    // Outgoing healing: +5 increases healing => support
    const outgoingHealingBoost = createBehavior({
      id: 'b7',
      mode: 'continuous',
      effects: [{ id: 'e7', type: 'outgoing_healing_modifier', amount: 5, operation: 'add' }],
    });
    expect(deriveTechniqueFunctionalCategories([outgoingHealingBoost])).toEqual(['support']);
  });
});

describe('CharacterTechnique Semantics: Technique Roll Contract (Part B)', () => {
  const createMockTechnique = (
    behaviors: MechanicalBehavior[],
    sourceType: 'quirk' | 'physical' | 'weapon' = 'quirk'
  ): CharacterTechnique => ({
    id: 'tech_roll_test',
    characterId: 202,
    name: 'Técnica de Tirada',
    description: 'Descripción',
    level: 2,
    sourceType,
    mechanicalBehaviors: behaviors,
    revision: 1,
  });

  it('A. automatic behavior reports no actor roll (hasRoll: false)', () => {
    const behavior = createBehavior({
      id: 'b_auto',
      resolution: {
        type: 'automatic',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'healing', resourceId: 'SA', amount: 10 }],
    });

    const contract = deriveTechniqueRollContract([behavior]);
    expect(contract.hasRoll).toBe(false);
    expect(contract.complete).toBe(true);
    expect(contract.warnings).toHaveLength(0);
    expect(contract.behaviors).toHaveLength(1);
    expect(contract.behaviors[0]).toEqual(expect.objectContaining({
      behaviorId: 'b_auto',
      resolutionType: 'automatic',
      requiresRoll: false,
      attribute: undefined,
      skill: undefined,
      difficulty: undefined,
      complete: true,
      warnings: [],
    }));
  });

  it('B. roll resolution with attribute + skill reports complete roll contract (hasRoll: true, complete: true)', () => {
    const behavior = createBehavior({
      id: 'b_roll',
      resolution: {
        type: 'roll',
        attribute: 'DES',
        skill: 'Combate cuerpo a cuerpo',
        attackType: 'physical',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'damage', dice: '1d6' }],
    });

    const contract = deriveTechniqueRollContract([behavior]);
    expect(contract.hasRoll).toBe(true);
    expect(contract.complete).toBe(true);
    expect(contract.warnings).toHaveLength(0);
    expect(contract.behaviors[0]).toMatchObject({
      behaviorId: 'b_roll',
      resolutionType: 'roll',
      requiresRoll: true,
      attribute: 'DES',
      skill: 'Combate cuerpo a cuerpo',
      complete: true,
      warnings: [],
    });
  });

  it('C. Quirk source does not auto-select Dominio de Quirk', () => {
    const behavior = createBehavior({
      id: 'b_quirk',
      resolution: {
        type: 'roll',
        attribute: 'INT',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'damage', dice: '2d6' }],
    });

    const tech = createMockTechnique([behavior], 'quirk');
    const contract = deriveTechniqueRollContract(tech);
    expect(contract.behaviors[0].skill).toBeUndefined();
    expect(contract.behaviors[0].skill).not.toBe('Dominio de Quirk');
  });

  it('D. Physical source does not auto-select Combate cuerpo a cuerpo', () => {
    const behavior = createBehavior({
      id: 'b_phys',
      resolution: {
        type: 'roll',
        attribute: 'FUE',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'damage', dice: '1d8' }],
    });

    const tech = createMockTechnique([behavior], 'physical');
    const contract = deriveTechniqueRollContract(tech);
    expect(contract.behaviors[0].skill).toBeUndefined();
    expect(contract.behaviors[0].skill).not.toBe('Combate cuerpo a cuerpo');
  });

  it('E. Weapon source does not auto-select weapon Skill', () => {
    const behavior = createBehavior({
      id: 'b_weapon',
      resolution: {
        type: 'roll',
        attribute: 'DES',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'damage', dice: '1d10' }],
    });

    const tech = createMockTechnique([behavior], 'weapon');
    const contract = deriveTechniqueRollContract(tech);
    expect(contract.behaviors[0].skill).toBeUndefined();
    expect(contract.behaviors[0].skill).not.toBe('Armas blancas');
  });

  it('F. condition.attribute does not become resolution.attribute', () => {
    const behavior = createBehavior({
      id: 'b_cond_attr',
      conditions: [
        {
          type: 'attribute',
          attributeId: 'FUE',
          comparison: '>=',
          value: 6,
        },
      ],
      resolution: {
        type: 'roll',
        attribute: 'DES',
        skill: 'Acrobacias',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'damage', dice: '2d6' }],
    });

    const contract = deriveTechniqueRollContract([behavior]);
    expect(contract.behaviors[0].attribute).toBe('DES');
    expect(contract.behaviors[0].attribute).not.toBe('FUE');
  });

  it('G. condition.skill / tag does not become resolution.skill', () => {
    const behavior = createBehavior({
      id: 'b_cond_skill',
      conditions: [
        {
          type: 'tag',
          tag: 'sigilo_activo',
          scope: 'any',
        },
      ],
      resolution: {
        type: 'roll',
        attribute: 'VOL',
        skill: 'Intimidación',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'status_apply', statusElementId: 'miedo' }],
    });

    const contract = deriveTechniqueRollContract([behavior]);
    expect(contract.behaviors[0].skill).toBe('Intimidación');
  });

  it('H. missing required roll configuration is reported incomplete (missing attribute)', () => {
    const behaviorMissingAttr = createBehavior({
      id: 'b_no_attr',
      resolution: {
        type: 'roll',
        skill: 'Alerta',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'damage', dice: '1d4' }],
    });

    const contract = deriveTechniqueRollContract([behaviorMissingAttr]);
    expect(contract.hasRoll).toBe(true);
    expect(contract.complete).toBe(false);
    expect(contract.warnings.length).toBeGreaterThan(0);
    expect(contract.behaviors[0].complete).toBe(false);
    expect(contract.behaviors[0].warnings[0]).toContain('requiere especificar un atributo');
  });

  it('I. multiple rolling behaviors are reported independently without collapsing', () => {
    const behavior1 = createBehavior({
      id: 'b_attack',
      resolution: {
        type: 'roll',
        attribute: 'DES',
        skill: 'Tirador',
        attackType: 'physical',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'damage', dice: '2d6' }],
    });

    const behavior2 = createBehavior({
      id: 'b_stun_check',
      resolution: {
        type: 'rd',
        attribute: 'INT',
        skill: 'Dominio de Quirk',
        difficulty: 14,
        outcomes: [],
      },
      effects: [{ id: 'e2', type: 'status_apply', statusElementId: 'aturdido' }],
    });

    const contract = deriveTechniqueRollContract([behavior1, behavior2]);
    expect(contract.hasRoll).toBe(true);
    expect(contract.complete).toBe(true);
    expect(contract.behaviors).toHaveLength(2);

    expect(contract.behaviors[0].behaviorId).toBe('b_attack');
    expect(contract.behaviors[0].resolutionType).toBe('roll');
    expect(contract.behaviors[0].attribute).toBe('DES');
    expect(contract.behaviors[0].skill).toBe('Tirador');

    expect(contract.behaviors[1].behaviorId).toBe('b_stun_check');
    expect(contract.behaviors[1].resolutionType).toBe('rd');
    expect(contract.behaviors[1].attribute).toBe('INT');
    expect(contract.behaviors[1].skill).toBe('Dominio de Quirk');
    expect(contract.behaviors[1].difficulty).toBe(14);
  });

  it('J. empty behaviors produces hasRoll = false and complete = true', () => {
    const contract = deriveTechniqueRollContract([]);
    expect(contract.hasRoll).toBe(false);
    expect(contract.complete).toBe(true);
    expect(contract.behaviors).toHaveLength(0);
    expect(contract.warnings).toHaveLength(0);
  });

  it('K. RD semantics match runtime behavior (requiresRoll = true, captures difficulty, attribute, skill)', () => {
    const behaviorRD = createBehavior({
      id: 'b_rd',
      resolution: {
        type: 'rd',
        attribute: 'RES',
        skill: 'Atletismo',
        difficulty: 16,
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'barrier', amount: 30 }],
    });

    const contract = deriveTechniqueRollContract([behaviorRD]);
    expect(contract.hasRoll).toBe(true);
    expect(contract.complete).toBe(true);
    expect(contract.behaviors[0].requiresRoll).toBe(true);
    expect(contract.behaviors[0].resolutionType).toBe('rd');
    expect(contract.behaviors[0].attribute).toBe('RES');
    expect(contract.behaviors[0].skill).toBe('Atletismo');
    expect(contract.behaviors[0].difficulty).toBe(16);
  });

  it('L. roll contract is purely declarative and does not calculate or fabricate rollResult', () => {
    const behavior = createBehavior({
      id: 'b_check',
      resolution: {
        type: 'roll',
        attribute: 'VOL',
        skill: 'Concentración',
        outcomes: [],
      },
      effects: [{ id: 'e1', type: 'bonus', targetStat: 'ini', amount: 3, operation: 'add' }],
    });

    const contract = deriveTechniqueRollContract([behavior]);
    expect((contract as any).rollResult).toBeUndefined();
    expect((contract.behaviors[0] as any).rollResult).toBeUndefined();
    expect((contract.behaviors[0] as any).dice).toBeUndefined();
  });
});

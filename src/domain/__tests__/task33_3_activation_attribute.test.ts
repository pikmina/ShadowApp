import { describe, it, expect } from 'vitest';
import {
  deriveTechniqueRollContract,
  characterTechniqueSchema,
  createCharacterTechniqueSchema,
  updateCharacterTechniqueSchema,
  type CharacterTechnique,
} from '../characterTechnique';
import {
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from '../mechanicalBehavior';

describe('Tarea 33.3 — Atributo de activación de la Técnica', () => {
  const createPhysicalOffenseBehavior = (): MechanicalBehavior => {
    const b = createDefaultMechanicalBehavior('beh_phys_1', 'active', 'Golpe demoledor');
    b.effects = [
      {
        id: 'eff_1',
        type: 'damage',
        damageType: 'fisico',
        dice: '2d8',
      },
    ];
    return b;
  };

  const createPsychicOffenseBehavior = (): MechanicalBehavior => {
    const b = createDefaultMechanicalBehavior('beh_psy_1', 'active', 'Ataque psíquico');
    b.effects = [
      {
        id: 'eff_2',
        type: 'damage',
        damageType: 'psiquico',
        dice: '2d8',
      },
    ];
    return b;
  };

  const createAutomaticUtilityBehavior = (): MechanicalBehavior => {
    const b = createDefaultMechanicalBehavior('beh_util_1', 'active', 'Aura pasiva');
    b.resolution = {
      type: 'automatic',
    };
    b.effects = [
      {
        id: 'eff_3',
        type: 'attribute_modifier',
        attributeId: 'res',
        amount: 2,
        operation: 'add',
      },
    ];
    return b;
  };

  it('Ofensiva física: deriva ACC vs Evasión, attribute = FUE, complete = true y ningún warning de atributo', () => {
    const technique: CharacterTechnique = {
      id: 'tech_1',
      characterId: 1,
      name: 'Golpe demoledor',
      description: '',
      level: 1,
      sourceType: 'physical',
      activationAttributeId: 'FUE',
      mechanicalBehaviors: [createPhysicalOffenseBehavior()],
      revision: 1,
    };

    const contract = deriveTechniqueRollContract(technique);

    expect(contract.hasRoll).toBe(true);
    expect(contract.complete).toBe(true);
    expect(contract.warnings).toHaveLength(0);
    expect(contract.behaviors).toHaveLength(1);

    const bContract = contract.behaviors[0];
    expect(bContract.requiresRoll).toBe(true);
    expect(bContract.attribute).toBe('FUE');
    expect(bContract.attackType).toBe('physical');
    expect(bContract.opposition?.targetDefense).toBe('EVA');
    expect(bContract.opposition?.label).toBe('Evasión');
    expect(bContract.rollFormula).toBe('2D10 + FUE vs. Evasión');
    expect(bContract.complete).toBe(true);
    expect(bContract.warnings).toHaveLength(0);
  });

  it('Cambio en tiempo real: cambiar FUE -> DES actualiza la fórmula inmediatamente sin alterar la oposición ACC vs Evasión', () => {
    const behavior = createPhysicalOffenseBehavior();
    const initialContract = deriveTechniqueRollContract([behavior], {
      activationAttributeId: 'FUE',
    });
    expect(initialContract.behaviors[0].attribute).toBe('FUE');
    expect(initialContract.behaviors[0].rollFormula).toBe('2D10 + FUE vs. Evasión');
    expect(initialContract.behaviors[0].opposition?.label).toBe('Evasión');

    const updatedContract = deriveTechniqueRollContract([behavior], {
      activationAttributeId: 'DES',
    });
    expect(updatedContract.behaviors[0].attribute).toBe('DES');
    expect(updatedContract.behaviors[0].rollFormula).toBe('2D10 + DES vs. Evasión');
    expect(updatedContract.behaviors[0].opposition?.label).toBe('Evasión');
    expect(updatedContract.complete).toBe(true);
    expect(updatedContract.warnings).toHaveLength(0);
  });

  it('Ofensiva mental: damageType = psiquico con activationAttribute = VOL deriva ACC vs Coraje, attribute = VOL, complete = true', () => {
    const technique: CharacterTechnique = {
      id: 'tech_2',
      characterId: 1,
      name: 'Onda mental',
      description: '',
      level: 1,
      sourceType: 'quirk',
      activationAttributeId: 'VOL',
      mechanicalBehaviors: [createPsychicOffenseBehavior()],
      revision: 1,
    };

    const contract = deriveTechniqueRollContract(technique);

    expect(contract.hasRoll).toBe(true);
    expect(contract.complete).toBe(true);
    expect(contract.warnings).toHaveLength(0);

    const bContract = contract.behaviors[0];
    expect(bContract.requiresRoll).toBe(true);
    expect(bContract.attribute).toBe('VOL');
    expect(bContract.attackType).toBe('mental');
    expect(bContract.opposition?.targetDefense).toBe('COR');
    expect(bContract.opposition?.label).toBe('Coraje');
    expect(bContract.rollFormula).toBe('2D10 + VOL vs. Coraje');
  });

  it('Sin atributo: activationAttribute = null con técnica ofensiva deriva ACC vs Evasión, complete = false y warning visible', () => {
    const technique: CharacterTechnique = {
      id: 'tech_3',
      characterId: 1,
      name: 'Golpe sin atributo',
      description: '',
      level: 1,
      sourceType: 'physical',
      activationAttributeId: null,
      mechanicalBehaviors: [createPhysicalOffenseBehavior()],
      revision: 1,
    };

    const contract = deriveTechniqueRollContract(technique);

    expect(contract.hasRoll).toBe(true);
    expect(contract.complete).toBe(false);
    expect(contract.warnings.length).toBeGreaterThan(0);
    expect(contract.warnings[0]).toContain(
      'El comportamiento "Golpe demoledor" requiere especificar un atributo para la tirada de resolución.'
    );

    const bContract = contract.behaviors[0];
    expect(bContract.requiresRoll).toBe(true);
    expect(bContract.attribute).toBeUndefined();
    expect(bContract.opposition?.label).toBe('Evasión');
    expect(bContract.complete).toBe(false);
  });

  it('Automática: técnica con requiresRoll = false y activationAttribute = null NO genera warning de atributo', () => {
    const technique: CharacterTechnique = {
      id: 'tech_4',
      characterId: 1,
      name: 'Aura defensiva',
      description: '',
      level: 1,
      sourceType: 'quirk',
      activationAttributeId: null,
      mechanicalBehaviors: [createAutomaticUtilityBehavior()],
      revision: 1,
    };

    const contract = deriveTechniqueRollContract(technique);

    expect(contract.hasRoll).toBe(false);
    expect(contract.complete).toBe(true);
    expect(contract.warnings).toHaveLength(0);
    expect(contract.behaviors[0].requiresRoll).toBe(false);
  });

  it('Precedencia de override: atributo explícito en comportamiento tiene prioridad sobre el de activación de la técnica', () => {
    const behaviorWithExplicitAttr = createDefaultMechanicalBehavior('beh_override_1', 'active', 'Disparo preciso');
    behaviorWithExplicitAttr.resolution = {
      type: 'roll',
      attribute: 'DES',
      attackType: 'physical',
    };
    behaviorWithExplicitAttr.effects = [
      {
        id: 'eff_4',
        type: 'damage',
        damageType: 'fisico',
        dice: '1d6',
      },
    ];

    const behaviorDefaultingToTechAttr = createDefaultMechanicalBehavior('beh_default_1', 'active', 'Golpe de fuerza');
    behaviorDefaultingToTechAttr.effects = [
      {
        id: 'eff_5',
        type: 'damage',
        damageType: 'fisico',
        dice: '1d6',
      },
    ];

    const technique: CharacterTechnique = {
      id: 'tech_5',
      characterId: 1,
      name: 'Combo táctico',
      description: '',
      level: 2,
      sourceType: 'physical',
      activationAttributeId: 'FUE',
      mechanicalBehaviors: [behaviorWithExplicitAttr, behaviorDefaultingToTechAttr],
      revision: 1,
    };

    const contract = deriveTechniqueRollContract(technique);

    expect(contract.complete).toBe(true);
    expect(contract.behaviors).toHaveLength(2);
    // Behavior 1: uses explicit DES
    expect(contract.behaviors[0].attribute).toBe('DES');
    expect(contract.behaviors[0].rollFormula).toBe('2D10 + DES vs. Evasión');
    // Behavior 2: uses technique's FUE
    expect(contract.behaviors[1].attribute).toBe('FUE');
    expect(contract.behaviors[1].rollFormula).toBe('2D10 + FUE vs. Evasión');
  });

  it('Validación de esquema Zod: parsea y valida activationAttributeId en creación, actualización y técnica completa', () => {
    const parsedCreate = createCharacterTechniqueSchema.parse({
      characterId: 10,
      name: 'Técnica de fuego',
      sourceType: 'quirk',
      activationAttributeId: 'INT',
      mechanicalBehaviors: [],
    });
    expect(parsedCreate.activationAttributeId).toBe('INT');

    const parsedUpdate = updateCharacterTechniqueSchema.parse({
      activationAttributeId: 'VEL',
    });
    expect(parsedUpdate.activationAttributeId).toBe('VEL');

    const parsedLegacy = characterTechniqueSchema.parse({
      id: 'tech_legacy',
      characterId: 10,
      name: 'Técnica antigua',
      sourceType: 'quirk',
      mechanicalBehaviors: [],
    });
    expect(parsedLegacy.activationAttributeId).toBeUndefined();
  });
});

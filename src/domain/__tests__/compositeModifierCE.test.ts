import { describe, test, expect } from 'vitest';
import {
  createCoreCategories,
  getCategoryOptions,
  getVisibleOptions,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findStatOption,
  findAttributeOption,
  findBonusOption,
  findPenaltyOption,
  findSkillOption,
  findRollTypeOption,
  findCostAdjustmentOption,
  findModifierTargetOption,
  type SystemMechanicsConfig,
} from '../systemMechanics';

describe('FASE CE-2: Composición determinista de CE para Modificadores', () => {
  const coreCategories = createCoreCategories();

  test('1. Caso Canónico Obligatorio: Técnica Nivel 1 (EVA +3, 2 turnos duración, 2 turnos cooldown) => 3 CE', () => {
    const canonicalTechnique = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'derived_stat_modifier',
              statId: 'EVA',
              amount: 3,
            },
          ],
          temporality: {
            duration: {
              type: 'turns',
              turns: 2,
            },
          },
          limitations: [
            {
              type: 'cooldown',
              turns: 2,
            },
          ],
        },
      ],
    };

    const policy = {
      baseAction: 1,
      objectUse: 1,
      techniqueByLevel: [
        { level: 1, cost: 1 },
        { level: 2, cost: 2 },
      ],
    };

    // Confirm individual options resolve:
    // EVA -> +2 CE
    expect(findStatOption(coreCategories, 'EVA')?.cost).toBe(2);
    // +3 -> +2 CE
    expect(findBonusOption(coreCategories, 3)?.cost).toBe(2);

    const resultCE = calculateTechniqueStructuralCost(
      canonicalTechnique,
      coreCategories,
      policy as any
    );

    // 2 (EVA) + 2 (+3) + 1 (2 turnos) - 2 (cooldown) = 3 CE
    // levelBase = 1
    // Math.max(1, 3) = 3
    expect(resultCE).toBe(3);
  });

  test('2. Solo Magnitud: +3 sin objetivo especificado => +2 CE', () => {
    const tech = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'derived_stat_modifier',
              statId: '',
              amount: 3,
            },
          ],
        },
      ],
    };

    const policy = {
      techniqueByLevel: [{ level: 1, cost: 1 }],
    };

    const resultCE = calculateTechniqueStructuralCost(
      tech,
      coreCategories,
      policy as any
    );

    // 0 (stat) + 2 (+3) = 2 CE
    expect(resultCE).toBe(2);
  });

  test('3. Objetivo + Magnitud: EVA +3 => CE objetivo (2) + CE magnitud (2) = 4 CE', () => {
    const tech = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'derived_stat_modifier',
              statId: 'EVA',
              amount: 3,
            },
          ],
        },
      ],
    };

    const resultCE = calculateTechniqueStructuralCost(
      tech,
      coreCategories,
      { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
    );

    // 2 (EVA) + 2 (+3) = 4 CE
    expect(resultCE).toBe(4);
  });

  test('4. Atributo + Magnitud: FUE +3 => CE FUE (1) + CE +3 (2) = 3 CE; +2 FUE = 2 CE', () => {
    const techFue3 = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'attribute_modifier',
              attributeId: 'FUE',
              amount: 3,
            },
          ],
        },
      ],
    };

    const resultCE3 = calculateTechniqueStructuralCost(
      techFue3,
      coreCategories,
      { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
    );

    // 1 (FUE) + 2 (+3) = 3 CE
    expect(resultCE3).toBe(3);

    const techFue2 = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'attribute_modifier',
              attributeId: 'FUE',
              amount: 2,
            },
          ],
        },
      ],
    };

    const resultCE2 = calculateTechniqueStructuralCost(
      techFue2,
      coreCategories,
      { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
    );

    // 1 (FUE) + 1 (+2) = 2 CE
    expect(resultCE2).toBe(2);
  });

  test('5. Valor histórico sin regla: amount = 99 no se borra ni rompe la resolución', () => {
    const techHistorical = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'derived_stat_modifier',
              statId: 'EVA',
              amount: 99,
            },
          ],
        },
      ],
    };

    const resultCE = calculateTechniqueStructuralCost(
      techHistorical,
      coreCategories,
      { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
    );

    // EVA (2) + amount 99 sin regla (0) = 2 CE
    expect(resultCE).toBe(2);

    // En UI, getVisibleOptions no encuentra 99 entre las disponibles nuevas
    const bonusOpts = getCategoryOptions(coreCategories, 'bonus');
    const visibleForNew = getVisibleOptions(bonusOpts, null);
    expect(visibleForNew.some((o) => o.amount === 99)).toBe(false);

    // Pero para valor histórico 99, se incluye
    const visibleForHist = getVisibleOptions(bonusOpts, 99);
    expect(visibleForHist).toBeDefined();
  });

  test('6. isAvailable: opción marcada isAvailable: false no aparece para nueva selección pero se resuelve históricamente', () => {
    const customCategories: SystemMechanicsConfig = JSON.parse(
      JSON.stringify(coreCategories)
    );
    const bonusCat = customCategories.find(
      (c) => c.id === 'core.numeric_modifier' || c.coreKey === 'numeric_modifier'
    );
    const rule3 = bonusCat?.rules.find((r) => r.id === 'core.numeric_modifier.3');
    if (rule3) {
      rule3.isAvailable = false;
    }

    const bonusOpts = getCategoryOptions(customCategories, 'numeric_modifier');

    // Para nueva selección (sin valor actual), 3 no está visible
    const newOptions = getVisibleOptions(bonusOpts, null);
    expect(newOptions.some((o) => o.runtimeKey === '3')).toBe(false);

    // Para un elemento histórico con amount = 3, sigue visible
    const historicalOptions = getVisibleOptions(bonusOpts, 3);
    expect(historicalOptions.some((o) => o.runtimeKey === '3')).toBe(true);

    // Y el calculador de CE sigue resolviendo su coste mecánico correctamente
    const tech = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'derived_stat_modifier',
              statId: 'EVA',
              amount: 3,
            },
          ],
        },
      ],
    };

    const resultCE = calculateTechniqueStructuralCost(
      tech,
      customCategories,
      { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
    );
    expect(resultCE).toBe(4); // EVA (2) + 3 (2) = 4
  });

  test('7. Piso por nivel: Si el coste mecánico es inferior al piso de nivel, prima el nivel', () => {
    const techNoMechanics = {
      level: 2,
      mechanicalBehaviors: [],
    };

    const policy = {
      techniqueByLevel: [
        { level: 1, cost: 1 },
        { level: 2, cost: 2 },
      ],
    };

    const resultCE = calculateTechniqueStructuralCost(
      techNoMechanics,
      coreCategories,
      policy as any
    );

    // mechanicCostSum = 0, levelBase = 2 => Math.max(2, 0) = 2
    expect(resultCE).toBe(2);
  });
});

describe('RULES-DATA-2.1 — Verificación Canónica Exhaustiva', () => {
  const coreCategories = createCoreCategories();

  test('1. Numeric modifiers canónicos exactos', () => {
    // +1 = 0, +2 = 1, +3 = 2, +4 = 3
    expect(findBonusOption(coreCategories, 1)?.cost).toBe(0);
    expect(findBonusOption(coreCategories, 2)?.cost).toBe(1);
    expect(findBonusOption(coreCategories, 3)?.cost).toBe(2);
    expect(findBonusOption(coreCategories, 4)?.cost).toBe(3);

    // -1 = 0, -2 = 1, -3 = 2, -4 = 3, -5 = 4
    expect(findPenaltyOption(coreCategories, -1)?.cost).toBe(0);
    expect(findPenaltyOption(coreCategories, -2)?.cost).toBe(1);
    expect(findPenaltyOption(coreCategories, -3)?.cost).toBe(2);
    expect(findPenaltyOption(coreCategories, -4)?.cost).toBe(3);
    expect(findPenaltyOption(coreCategories, -5)?.cost).toBe(4);

    // Confirmar que +5 NO está disponible para nuevas reglas
    const numModOpts = getCategoryOptions(coreCategories, 'numeric_modifier');
    const visibleForNew = getVisibleOptions(numModOpts, null);
    expect(visibleForNew.some((o) => o.runtimeKey === '5' || o.id === 'core.numeric_modifier.5')).toBe(false);

    // Pero si un elemento histórico lo referencia, no rompe su resolución
    const opt5 = numModOpts.find((o) => o.runtimeKey === '5' || o.id === 'core.numeric_modifier.5');
    expect(opt5).toBeDefined();
    expect(opt5?.isAvailable).toBe(false);
  });

  test('2. Costes de todos los destinos canónicos', () => {
    // Atributos base = +1 CE
    expect(findAttributeOption(coreCategories, 'FUE')?.cost).toBe(1);
    expect(findAttributeOption(coreCategories, 'DES')?.cost).toBe(1);
    expect(findAttributeOption(coreCategories, 'RES')?.cost).toBe(1);
    expect(findAttributeOption(coreCategories, 'INT')?.cost).toBe(1);
    expect(findAttributeOption(coreCategories, 'VEL')?.cost).toBe(1);
    expect(findAttributeOption(coreCategories, 'VOL')?.cost).toBe(1);

    // Derivados
    expect(findStatOption(coreCategories, 'DB')?.cost).toBe(1); // Daño Base = 1
    expect(findStatOption(coreCategories, 'EVA')?.cost).toBe(2); // Evasión = 2
    expect(findStatOption(coreCategories, 'COR')?.cost).toBe(2); // Coraje = 2
    expect(findStatOption(coreCategories, 'INI')?.cost).toBe(2); // Iniciativa = 2
    expect(findStatOption(coreCategories, 'RD')?.cost).toBe(3); // Reducción de Daño = 3

    // Otros destinos
    expect(findSkillOption(coreCategories, 'carisma')?.cost).toBe(3); // Carisma = 3
    expect(findSkillOption(coreCategories, 'presencia')?.cost).toBe(3); // Presencia = 3
    expect(findRollTypeOption(coreCategories, 'roll')?.cost).toBe(3); // Tirada = 3
    expect(findCostAdjustmentOption(coreCategories, 'stamina_reduction')?.cost).toBe(4); // Reducción de Estamina = 4

    // Unified target lookup helper
    expect(findModifierTargetOption(coreCategories, 'FUE')?.cost).toBe(1);
    expect(findModifierTargetOption(coreCategories, 'DB')?.cost).toBe(1);
    expect(findModifierTargetOption(coreCategories, 'EVA')?.cost).toBe(2);
    expect(findModifierTargetOption(coreCategories, 'COR')?.cost).toBe(2);
    expect(findModifierTargetOption(coreCategories, 'INI')?.cost).toBe(2);
    expect(findModifierTargetOption(coreCategories, 'RD')?.cost).toBe(3);
    expect(findModifierTargetOption(coreCategories, 'Carisma')?.cost).toBe(3);
    expect(findModifierTargetOption(coreCategories, 'Presencia')?.cost).toBe(3);
    expect(findModifierTargetOption(coreCategories, 'Tirada')?.cost).toBe(3);
    expect(findModifierTargetOption(coreCategories, 'Reducción de Estamina')?.cost).toBe(4);
  });

  test('3. Composición: +3 EVA / 2 turnos = 5 CE', () => {
    const tech = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'derived_stat_modifier',
              statId: 'EVA',
              amount: 3,
            },
          ],
          temporality: {
            duration: {
              type: 'turns',
              turns: 2,
            },
          },
        },
      ],
    };

    const resultCE = calculateTechniqueStructuralCost(
      tech,
      coreCategories,
      { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
    );

    // +3 numeric_modifier = +2 CE
    // Evasión = +2 CE
    // 2 turnos = +1 CE
    // TOTAL = 5 CE
    expect(resultCE).toBe(5);
  });

  test('4. Composición: +2 FUE = 2 CE', () => {
    const tech = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'attribute_modifier',
              attributeId: 'FUE',
              amount: 2,
            },
          ],
        },
      ],
    };

    const resultCE = calculateTechniqueStructuralCost(
      tech,
      coreCategories,
      { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
    );

    // +2 numeric_modifier = +1 CE
    // Fuerza = +1 CE
    // TOTAL = 2 CE
    expect(resultCE).toBe(2);
  });

  test('5. Composición: +1 Carisma = 3 CE; +1 Presencia = 3 CE; +1 Tirada = 3 CE; Reducción Estamina = 4 CE', () => {
    const techCarisma = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'skill_modifier',
              skillId: 'carisma',
              amount: 1,
            },
          ],
        },
      ],
    };
    expect(calculateTechniqueStructuralCost(techCarisma, coreCategories)).toBe(3);

    const techPresencia = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'skill_modifier',
              skillId: 'presencia',
              amount: 1,
            },
          ],
        },
      ],
    };
    expect(calculateTechniqueStructuralCost(techPresencia, coreCategories)).toBe(3);

    const techTirada = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'roll_modifier',
              rollType: 'roll',
              amount: 1,
            },
          ],
        },
      ],
    };
    expect(calculateTechniqueStructuralCost(techTirada, coreCategories)).toBe(3);

    const techEstamina = {
      level: 1,
      mechanicalBehaviors: [
        {
          mode: 'active',
          effects: [
            {
              type: 'cost_modifier',
              scopeId: 'stamina',
              amount: -1,
            },
          ],
        },
      ],
    };
    expect(calculateTechniqueStructuralCost(techEstamina, coreCategories)).toBe(4);
  });
});


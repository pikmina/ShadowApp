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

  test('4. Atributo + Magnitud: FUE +3 => CE FUE (0) + CE +3 (2) = 2 CE', () => {
    const tech = {
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

    const resultCE = calculateTechniqueStructuralCost(
      tech,
      coreCategories,
      { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
    );

    // 0 (FUE) + 2 (+3) = 2 CE
    expect(resultCE).toBe(2);
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

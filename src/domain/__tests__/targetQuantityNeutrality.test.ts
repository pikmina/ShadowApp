import { describe, it, expect } from 'vitest';
import { createCoreCategories, CORE_CATEGORIES } from '../coreRuleCatalog';
import {
  findTargetCountOption,
  calculateTechniqueStructuralCost,
  validateBehaviorMechanicalValues,
  type SystemMechanicsConfig,
} from '../systemMechanics';
import { createDefaultMechanicalBehavior, type MechanicalBehavior } from '../mechanicalBehavior';

describe('Unificación de tarifas neutrales por cantidad de objetivos', () => {
  const categories: SystemMechanicsConfig = createCoreCategories();

  it('1. la categoría core.target_count tiene el nombre administrativo "Cantidad de objetivos"', () => {
    expect(CORE_CATEGORIES.target_count).toBe('Cantidad de objetivos');
    const targetCountCat = categories.find(c => c.id === 'core.target_count');
    expect(targetCountCat).toBeDefined();
    expect(targetCountCat?.name).toBe('Cantidad de objetivos');
  });

  it('2. las mismas cantidades resuelven exactamente la misma tarifa para character, object, structure y zone', () => {
    const entityTypes = ['character', 'object', 'structure', 'zone'];

    for (const type of entityTypes) {
      const opt1 = findTargetCountOption(categories, 1, type);
      expect(opt1).toBeDefined();
      expect(opt1?.cost).toBe(0);

      const opt2 = findTargetCountOption(categories, 2, type);
      expect(opt2).toBeDefined();
      expect(opt2?.cost).toBe(2);

      const opt3 = findTargetCountOption(categories, 3, type);
      expect(opt3).toBeDefined();
      expect(opt3?.cost).toBe(3);

      const opt4 = findTargetCountOption(categories, 4, type);
      expect(opt4).toBeDefined();
      expect(opt4?.cost).toBe(4);

      const opt5 = findTargetCountOption(categories, 5, type);
      expect(opt5).toBeDefined();
      expect(opt5?.cost).toBe(5);

      const optAll = findTargetCountOption(categories, 'all', type);
      expect(optAll).toBeDefined();
      expect(optAll?.cost).toBe(0);
    }
  });

  it('3. las referencias históricas (ally_N, enemy_N) no producen diferencias de coste por facción', () => {
    const enemy2 = findTargetCountOption(categories, 2, 'enemy');
    const ally2 = findTargetCountOption(categories, 2, 'ally');
    const character2 = findTargetCountOption(categories, 2, 'character');

    expect(enemy2?.cost).toBe(2);
    expect(ally2?.cost).toBe(2);
    expect(character2?.cost).toBe(2);

    const enemy3 = findTargetCountOption(categories, 3, 'enemy');
    expect(enemy3?.cost).toBe(3);
    const ally3 = findTargetCountOption(categories, 3, 'ally');
    expect(ally3?.cost).toBe(3);
    const character3 = findTargetCountOption(categories, 3, 'character');
    expect(character3?.cost).toBe(3);
  });

  it('4. las categorías personalizadas se modifican de forma dinámica en administración y aplican a las técnicas', () => {
    const customCats = JSON.parse(JSON.stringify(categories)) as SystemMechanicsConfig;
    const tcCat = customCats.find(c => c.id === 'core.target_count');
    const rule2 = tcCat?.rules.find(r => r.runtimeKey === '2');
    if (rule2) rule2.cost = 10;

    const optChar2 = findTargetCountOption(customCats, 2, 'character');
    expect(optChar2?.cost).toBe(10);

    const behavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('tech_custom'),
      effects: [{ id: 'eff1', type: 'damage', dice: '2D6' }],
      target: {
        type: 'character',
        quantity: { mode: 'up_to', count: 2 },
      },
    };

    // Damage 2D6 (3 CE) + target_count 2 (10 CE) = 13 CE
    const cost = calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [behavior] }, customCats);
    expect(cost).toBe(13);
  });

  it('5. una cantidad sin tarifa válida en el catálogo no recibe un coste inventado y retorna undefined', () => {
    const opt6 = findTargetCountOption(categories, 6, 'character');
    expect(opt6).toBeUndefined();

    const opt100 = findTargetCountOption(categories, 100, 'object');
    expect(opt100).toBeUndefined();

    // Verification that validateTechniqueBehavior flags unconfigured quantities
    const behaviorWithUnconfiguredCount: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('tech_unconfigured'),
      target: {
        type: 'character',
        quantity: { mode: 'up_to', count: 99 },
      },
    };
    const validationResult = validateBehaviorMechanicalValues(behaviorWithUnconfiguredCount, categories);
    expect(validationResult.errors).toContain('Objetivo: La cantidad de objetivos "99" no está configurada en Reglas del Sistema.');
  });

  it('6. las técnicas guardan únicamente su configuración estructural de objetivos sin duplicar costes', () => {
    const behavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('tech_clean'),
      target: {
        type: 'character',
        excludeSelf: true,
        quantity: { mode: 'up_to', count: 3 },
      },
    };

    expect(behavior.target).not.toHaveProperty('cost');
    expect(behavior.target.quantity).toEqual({ mode: 'up_to', count: 3 });
  });

  it('7. los costes estructurales de técnicas multiobjetivo mantienen coherencia sin regresiones no justificadas', () => {
    const tech2Char: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('tech_2char'),
      effects: [{ id: 'e1', type: 'damage', dice: '2D6' }],
      target: { type: 'character', quantity: { mode: 'up_to', count: 2 } },
    };
    // Damage 2D6 (3 CE) + count 2 (2 CE) = 5 CE
    expect(calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [tech2Char] }, categories)).toBe(5);

    const tech3Char: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('tech_3char'),
      effects: [{ id: 'e1', type: 'damage', dice: '2D6' }],
      target: { type: 'character', quantity: { mode: 'up_to', count: 3 } },
    };
    // Damage 2D6 (3 CE) + count 3 (3 CE) = 6 CE
    expect(calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [tech3Char] }, categories)).toBe(6);
  });
});

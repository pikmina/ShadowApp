import { describe, test, expect } from 'vitest';
import { createCoreCategories } from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findDamageOption,
  findDamageTypeOption,
  findHealingOption,
  findBarrierOption,
} from '../systemMechanics';

describe('FASE CE-3B: Normalización determinista de Daño, Curación y Barrera', () => {
  const coreCategories = createCoreCategories();

  describe('1. Daño (damage) - Composición Aditiva', () => {
    test('Calcula coste de daño con dados y tipo de daño independientes', () => {
      const tech = {
        level: 1,
        mechanicalBehaviors: [
          {
            mode: 'active',
            effects: [
              {
                type: 'damage',
                dice: '4D8',
                damageType: 'fuego',
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

      // 4D8 -> +4 CE, fuego -> +0 CE
      // Total structural cost = 4 CE
      expect(resultCE).toBe(4);
    });

    test('findDamageTypeOption resuelve correctamente tipos de daño', () => {
      const fuegoOpt = findDamageTypeOption(coreCategories, 'fuego');
      expect(fuegoOpt).toBeDefined();
      expect(fuegoOpt?.runtimeKey).toBe('fuego');
      expect(fuegoOpt?.cost).toBe(0);

      const invalidOpt = findDamageTypeOption(coreCategories, 'unknown_type');
      expect(invalidOpt).toBeUndefined();
    });
  });

  describe('2. Curación (healing) - Resolución Determinista', () => {
    test('Resuelve coste de curación con magnitud estructurada de dados', () => {
      const tech = {
        level: 1,
        mechanicalBehaviors: [
          {
            mode: 'active',
            effects: [
              {
                type: 'healing',
                resourceId: 'SA',
                magnitude: {
                  kind: 'dice',
                  formula: '2D6',
                },
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

      // 2D6 con SA -> +3 CE
      expect(resultCE).toBe(3);
    });

    test('Resuelve coste de curación con magnitud estructurada fija', () => {
      const tech = {
        level: 1,
        mechanicalBehaviors: [
          {
            mode: 'active',
            effects: [
              {
                type: 'healing',
                resourceId: 'ES',
                magnitude: {
                  kind: 'fixed',
                  amount: 5,
                },
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

      // 5 con ES (es5) -> +3 CE
      expect(resultCE).toBe(3);
    });

    test('Soporta fallback legacy para valores hp/es guardados como planos', () => {
      const techLegacy = {
        level: 1,
        mechanicalBehaviors: [
          {
            mode: 'active',
            effects: [
              {
                type: 'healing',
                resourceId: 'SA',
                amount: 10, // hp10 -> +6 CE
              },
            ],
          },
        ],
      };

      const resultCE = calculateTechniqueStructuralCost(
        techLegacy,
        coreCategories,
        { techniqueByLevel: [{ level: 1, cost: 1 }] } as any
      );

      expect(resultCE).toBe(6);
    });
  });

  describe('3. Barrera (barrier) - Resolución Determinista', () => {
    test('Resuelve coste de barrera numérico de forma determinista', () => {
      const tech = {
        level: 1,
        mechanicalBehaviors: [
          {
            mode: 'active',
            effects: [
              {
                type: 'barrier',
                amount: 30, // Barrera 30 -> +3 CE
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

      expect(resultCE).toBe(3);
    });

    test('findBarrierOption resuelve montos válidos', () => {
      const opt30 = findBarrierOption(coreCategories, 30);
      expect(opt30).toBeDefined();
      expect(opt30?.cost).toBe(3);

      const opt99 = findBarrierOption(coreCategories, 99);
      expect(opt99).toBeUndefined();
    });
  });
});

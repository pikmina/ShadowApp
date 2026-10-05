import { describe, test, expect } from 'vitest';
import {
  createCoreCategories,
  migrateCanonicalCatalogRulesData3A,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findStatusOption,
  findObjectManipulationOption,
  findTransformationOption,
  findDurationOption,
} from '../systemMechanics';
import type { MechanicalBehavior } from '../mechanicalBehavior';

function makeBehavior(overrides: Partial<MechanicalBehavior> & { name: string }): MechanicalBehavior {
  return {
    id: `bh_${Math.random().toString(36).substring(2, 9)}`,
    mode: 'active',
    conditions: [],
    conditionLogic: 'all',
    limitations: [],
    effects: [],
    ...overrides,
  };
}

describe('RULES-DATA-3A: Canonical Catalog, Composition & CE Balance', () => {
  const categories = createCoreCategories();

  describe('1. Altered Statuses (24 canonical statuses + legacy preservation)', () => {
    const expectedStatuses: Array<{ key: string; name: string; cost: number }> = [
      { key: 'asfixia', name: 'Asfixia', cost: 3 },
      { key: 'aturdido', name: 'Aturdido', cost: 3 },
      { key: 'berserker_grave', name: 'Berserker Grave', cost: 5 },
      { key: 'berserker_leve', name: 'Berserker Leve', cost: 3 },
      { key: 'coma_ilusorio', name: 'Coma Ilusorio', cost: 4 },
      { key: 'congelado', name: 'Congelado', cost: 3 },
      { key: 'conmocion', name: 'Conmoción', cost: 3 },
      { key: 'desbalanceado', name: 'Desbalanceado', cost: 3 },
      { key: 'desorientado', name: 'Desorientado', cost: 3 },
      { key: 'dormido', name: 'Dormido', cost: 3 },
      { key: 'electrocutado', name: 'Electrocutado', cost: 3 },
      { key: 'hemorragia_grave', name: 'Hemorragia Grave', cost: 6 },
      { key: 'hemorragia_leve', name: 'Hemorragia Leve', cost: 3 },
      { key: 'locura', name: 'Locura', cost: 3 },
      { key: 'miedo', name: 'Miedo / Aterrorizado', cost: 3 },
      { key: 'mutacion_visual', name: 'Mutación Visual', cost: 3 },
      { key: 'nulificacion_don', name: 'Nulificación de Don', cost: 5 },
      { key: 'quemadura_grave', name: 'Quemadura Grave', cost: 5 },
      { key: 'quemadura_leve', name: 'Quemadura Leve', cost: 2 },
      { key: 'ralentizado', name: 'Ralentizado', cost: 2 },
      { key: 'sobrecalentado', name: 'Sobrecalentado', cost: 3 },
      { key: 'veneno_grave', name: 'Veneno Grave', cost: 5 },
      { key: 'veneno_leve', name: 'Veneno Leve', cost: 2 },
      { key: 'inmovilizado', name: 'Inmovilizado', cost: 3 },
    ];

    test('all 24 canonical statuses exist with exact canonical CE', () => {
      const statusCat = categories.find(c => c.id === 'core.status');
      expect(statusCat).toBeDefined();

      for (const expected of expectedStatuses) {
        const option = findStatusOption(categories, `core.status.${expected.key}`) ||
          findStatusOption(categories, expected.key);
        expect(option, `Status option ${expected.key} should exist`).toBeDefined();
        expect(option?.cost, `Status ${expected.key} should cost ${expected.cost} CE`).toBe(expected.cost);
      }
    });

    test('non-canonical legacy statuses are purged and canonical family statuses exist', () => {
      const statusCat = categories.find(c => c.id === 'core.status');
      expect(statusCat).toBeDefined();

      const purgedKeys = ['vulnerable', 'paralyzed'];
      for (const pur of purgedKeys) {
        const rule = statusCat?.rules.find(r => r.runtimeKey === pur || r.id === `core.status.${pur}`);
        expect(rule, `Non-canonical status ${pur} should be purged`).toBeUndefined();
      }

      const familyRule = statusCat?.rules.find(r => r.runtimeKey === 'berserker' || r.id === 'core.status.berserker');
      expect(familyRule, 'Canonical Berserker family should exist').toBeDefined();
    });

    test('technique applying status Quemadura Leve costs exactly +2 CE (no double charging)', () => {
      const behavior = makeBehavior({
        name: 'Flame Burn',
        mode: 'active',
        effects: [
          {
            id: 'eff-1',
            type: 'status_apply',
            statusElementId: 'core.status.quemadura_leve',
          },
        ],
      });

      const cost = calculateTechniqueStructuralCost([behavior], categories);
      expect(cost).toBe(2);
    });

    test('technique combining damage 3D6 (5 CE) and status_apply Quemadura Leve (+2 CE) costs exactly 7 CE', () => {
      const behavior = makeBehavior({
        name: 'Fire Blast with Burn',
        mode: 'active',
        effects: [
          {
            id: 'eff-1',
            type: 'damage',
            dice: '3D6',
          },
          {
            id: 'eff-2',
            type: 'status_apply',
            statusElementId: 'core.status.quemadura_leve',
          },
        ],
      });

      // 3D6 (5 CE) + Quemadura Leve (2 CE) = 7 CE
      const cost = calculateTechniqueStructuralCost([behavior], categories);
      expect(cost).toBe(7);
    });
  });

  describe('2. Object Manipulation (small=1, medium=2, large=4, huge=6)', () => {
    const expectedSizes: Array<{ size: string; cost: number }> = [
      { size: 'small', cost: 1 },
      { size: 'medium', cost: 2 },
      { size: 'large', cost: 4 },
      { size: 'huge', cost: 6 },
    ];

    test('all 4 object manipulation sizes exist with exact canonical CE', () => {
      const cat = categories.find(c => c.id === 'core.object_manipulation');
      expect(cat).toBeDefined();

      for (const expected of expectedSizes) {
        const option = findObjectManipulationOption(categories, expected.size);
        expect(option, `Size ${expected.size} should exist`).toBeDefined();
        expect(option?.cost, `Size ${expected.size} should cost ${expected.cost} CE`).toBe(expected.cost);
      }
    });

    test('technique with object manipulation calculates structural cost correctly', () => {
      const behaviorLarge = makeBehavior({
        name: 'Levitate Boulder',
        mode: 'active',
        effects: [
          {
            id: 'eff-1',
            type: 'object_manipulation',
            size: 'large',
          },
        ],
      });

      const cost = calculateTechniqueStructuralCost([behaviorLarge], categories);
      expect(cost).toBe(4);
    });
  });

  describe('3. Transformation (corporal/body=1, 2m=2, 5m=3, 10m=4, 20m=6)', () => {
    const expectedTransformations: Array<{ key: string; cost: number }> = [
      { key: 'body', cost: 1 },
      { key: '2m', cost: 2 },
      { key: '5m', cost: 3 },
      { key: '10m', cost: 4 },
      { key: '20m', cost: 6 },
    ];

    test('all 5 transformation magnitudes exist with exact canonical CE (Corporal is +1 CE)', () => {
      const cat = categories.find(c => c.id === 'core.transformation');
      expect(cat).toBeDefined();

      for (const expected of expectedTransformations) {
        const option = findTransformationOption(categories, expected.key);
        expect(option, `Transformation ${expected.key} should exist`).toBeDefined();
        expect(option?.cost, `Transformation ${expected.key} should cost ${expected.cost} CE`).toBe(expected.cost);
      }

      // Explicit check that 'corporal' alias also resolves to 1 CE
      const corporalOpt = findTransformationOption(categories, 'corporal');
      expect(corporalOpt?.cost).toBe(1);
    });

    test('technique with transformation 5m calculates 3 CE', () => {
      const behavior = makeBehavior({
        name: 'Giant Form 5m',
        mode: 'active',
        effects: [
          {
            id: 'eff-1',
            type: 'transformation',
            magnitude: { type: '5m', value: 3 },
          },
        ],
      });

      const cost = calculateTechniqueStructuralCost([behavior], categories);
      expect(cost).toBe(3);
    });
  });

  describe('4. Passive Duration / Long-Term Duration (1 day=4, 1 week=8, 1 month=14)', () => {
    const expectedDurations: Array<{ key: string; cost: number }> = [
      { key: '1_day', cost: 4 },
      { key: '1_week', cost: 8 },
      { key: '1_month', cost: 14 },
    ];

    test('all 3 long-term passive durations exist with exact canonical CE', () => {
      const cat = categories.find(c => c.id === 'core.duration');
      expect(cat).toBeDefined();

      for (const expected of expectedDurations) {
        const option = findDurationOption(categories, expected.key);
        expect(option, `Duration ${expected.key} should exist`).toBeDefined();
        expect(option?.cost, `Duration ${expected.key} should cost ${expected.cost} CE`).toBe(expected.cost);
      }
    });

    test('technique with passive long-term duration (1 week) adds +8 CE to structural cost', () => {
      const behavior = makeBehavior({
        name: 'Weekly Ward',
        mode: 'continuous',
        temporality: {
          duration: {
            type: '1_week',
          },
        },
        effects: [
          {
            id: 'eff-1',
            type: 'barrier',
            amount: 20,
          },
        ],
      });

      // Barrier 20 = +2 CE, Duration 1 week = +8 CE -> Total = 10 CE
      const cost = calculateTechniqueStructuralCost([behavior], categories);
      expect(cost).toBe(10);
    });
  });

  describe('5. Database as Source of Truth (Dynamic Configurable Costs)', () => {
    test('cost calculations adapt dynamically when admin customizes costs in database', () => {
      const customCategories = JSON.parse(JSON.stringify(categories));

      // Modify Transformation 5m: 3 CE -> 9 CE
      const transCat = customCategories.find((c: any) => c.id === 'core.transformation');
      const rule5m = transCat.rules.find((r: any) => r.runtimeKey === '5m');
      rule5m.cost = 9;

      // Modify Status Quemadura Leve: 2 CE -> 7 CE
      const statusCat = customCategories.find((c: any) => c.id === 'core.status');
      const ruleQuem = statusCat.rules.find((r: any) => r.runtimeKey === 'quemadura_leve');
      ruleQuem.cost = 7;

      // Modify Object Manipulation Large: 4 CE -> 12 CE
      const objCat = customCategories.find((c: any) => c.id === 'core.object_manipulation');
      const ruleLarge = objCat.rules.find((r: any) => r.runtimeKey === 'large');
      ruleLarge.cost = 12;

      // Modify Duration 1 Day: 4 CE -> 15 CE
      const durCat = customCategories.find((c: any) => c.id === 'core.duration');
      const ruleDay = durCat.rules.find((r: any) => r.runtimeKey === '1_day');
      ruleDay.cost = 15;

      const behavior = makeBehavior({
        name: 'Custom Multi-Effect Technique',
        mode: 'active',
        temporality: {
          duration: {
            type: '1_day',
          },
        },
        effects: [
          {
            id: 'eff-1',
            type: 'transformation',
            magnitude: { type: '5m', value: 3 },
          },
          {
            id: 'eff-2',
            type: 'status_apply',
            statusElementId: 'core.status.quemadura_leve',
          },
          {
            id: 'eff-3',
            type: 'object_manipulation',
            size: 'large',
          },
        ],
      });

      // Dynamic calculation: 15 (duration) + 9 (trans) + 7 (status) + 12 (object) = 43 CE
      const cost = calculateTechniqueStructuralCost([behavior], customCategories);
      expect(cost).toBe(43);
    });
  });

  describe('6. Controlled One-Shot Migration (RULES-DATA-3A)', () => {
    test('migrateCanonicalCatalogRulesData3A reconciles new categories and preserves custom user rules', () => {
      const initial = createCoreCategories();
      // Add custom user rule to status category
      const customUserRule = {
        id: 'custom.status.bloodlust',
        name: 'Sed de Sangre Custom',
        cost: 11,
        isAvailable: true,
        runtimeKey: 'bloodlust_custom',
        ruleType: 'effect' as const,
        effect: {
          type: 'status' as const,
          statusElementId: 'custom.status.bloodlust',
        },
      };
      const modifiedInitial = initial.map(c => {
        if (c.id === 'core.status') {
          return { ...c, rules: [...c.rules, customUserRule] };
        }
        return c;
      });

      const migrated = migrateCanonicalCatalogRulesData3A(modifiedInitial);

      const statusCat = migrated.find(c => c.id === 'core.status');
      expect(statusCat).toBeDefined();

      // Custom rule is preserved
      const preservedCustom = statusCat?.rules.find(r => r.id === 'custom.status.bloodlust');
      expect(preservedCustom).toBeDefined();
      expect(preservedCustom?.cost).toBe(11);

      // Canonical statuses exist
      const asfixia = statusCat?.rules.find(r => r.runtimeKey === 'asfixia');
      expect(asfixia).toBeDefined();
      expect(asfixia?.cost).toBe(3);
    });
  });
});

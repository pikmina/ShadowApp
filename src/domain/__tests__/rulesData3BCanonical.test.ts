import { describe, test, expect } from 'vitest';
import {
  createCoreCategories,
  migrateCanonicalCatalogRulesData3B,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findTargetOption,
  findTargetCountOption,
  findAreaOption,
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

describe('RULES-DATA-3B: Target, Capacity, Radius & Spatial Range Catalog', () => {
  const categories = createCoreCategories();

  describe('1. Target Types (Self, Person, Object, Structure)', () => {
    test('target self costs 0 CE and maintains CE-4B.1 invariant', () => {
      const behavior = makeBehavior({
        name: 'Self Buff',
        mode: 'active',
        target: {
          type: 'self',
        },
      });

      const cost = calculateTechniqueStructuralCost([behavior], categories);
      expect(cost).toBe(0);
    });

    test('target self ignores/eliminates range, area, quantity, and selectionMode without adding cost', () => {
      // Even if legacy or contaminated payload is passed with self
      const contaminatedBehavior = makeBehavior({
        name: 'Contaminated Self',
        mode: 'active',
        target: {
          type: 'self',
          quantity: { mode: 'up_to', count: 5 },
          range: { type: 'distance', distanceMeters: 50 },
          area: { shape: 'radius', sizeMeters: 50 },
          selectionMode: 'random',
        } as any,
      });

      const cost = calculateTechniqueStructuralCost([contaminatedBehavior], categories);
      expect(cost).toBe(0);
    });

    test('single person (enemy / ally / character) costs 0 CE', () => {
      const singleEnemy = makeBehavior({
        name: 'Single Enemy Action',
        mode: 'active',
        target: {
          type: 'enemy',
          quantity: { mode: 'exact', count: 1 },
        },
      });
      expect(calculateTechniqueStructuralCost([singleEnemy], categories)).toBe(0);

      const singleAlly = makeBehavior({
        name: 'Single Ally Action',
        mode: 'active',
        target: {
          type: 'ally',
          quantity: { mode: 'exact', count: 1 },
        },
      });
      expect(calculateTechniqueStructuralCost([singleAlly], categories)).toBe(0);

      const singleChar = makeBehavior({
        name: 'Single Character Action',
        mode: 'active',
        target: {
          type: 'character',
          quantity: { mode: 'exact', count: 1 },
        },
      });
      expect(calculateTechniqueStructuralCost([singleChar], categories)).toBe(0);
    });

    test('1 object costs exactly 1 CE', () => {
      const singleObject = makeBehavior({
        name: 'Manipulate Single Object',
        mode: 'active',
        target: {
          type: 'object',
          quantity: { mode: 'exact', count: 1 },
        },
      });

      const cost = calculateTechniqueStructuralCost([singleObject], categories);
      expect(cost).toBe(1);
    });

    test('1 structure costs exactly 3 CE', () => {
      const singleStructure = makeBehavior({
        name: 'Affect Building Structure',
        mode: 'active',
        target: {
          type: 'structure',
          quantity: { mode: 'exact', count: 1 },
        },
      });

      const cost = calculateTechniqueStructuralCost([singleStructure], categories);
      expect(cost).toBe(3);
    });
  });

  describe('2. Target Capacity & Enemy/Ally Asymmetry', () => {
    test('enemy target capacities: 2 enemies = 2 CE, 3 enemies = 3 CE', () => {
      const twoEnemies = makeBehavior({
        name: 'Two Enemies Strike',
        mode: 'active',
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 2 },
        },
      });
      expect(calculateTechniqueStructuralCost([twoEnemies], categories)).toBe(2);

      const threeEnemies = makeBehavior({
        name: 'Three Enemies Strike',
        mode: 'active',
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 3 },
        },
      });
      expect(calculateTechniqueStructuralCost([threeEnemies], categories)).toBe(3);
    });

    test('ally target capacities: 2 allies = 3 CE, 3 allies = 4 CE', () => {
      const twoAllies = makeBehavior({
        name: 'Two Allies Shield',
        mode: 'active',
        target: {
          type: 'ally',
          quantity: { mode: 'up_to', count: 2 },
        },
      });
      expect(calculateTechniqueStructuralCost([twoAllies], categories)).toBe(3);

      const threeAllies = makeBehavior({
        name: 'Three Allies Shield',
        mode: 'active',
        target: {
          type: 'ally',
          quantity: { mode: 'up_to', count: 3 },
        },
      });
      expect(calculateTechniqueStructuralCost([threeAllies], categories)).toBe(4);
    });

    test('asymmetry: 2 enemies (2 CE) vs 2 allies (3 CE) is derived from catalog configuration, not hardcode', () => {
      const optEnemy2 = findTargetCountOption(categories, 2, 'enemy');
      const optAlly2 = findTargetCountOption(categories, 2, 'ally');

      expect(optEnemy2).toBeDefined();
      expect(optEnemy2?.cost).toBe(2);

      expect(optAlly2).toBeDefined();
      expect(optAlly2?.cost).toBe(3);

      // Verify dynamically modifiable: if admin changes ally_2 to 10 CE, calculation uses 10 CE
      const customCats = JSON.parse(JSON.stringify(categories));
      const tcCat = customCats.find((c: any) => c.id === 'core.target_count');
      const ally2Rule = tcCat.rules.find((r: any) => r.runtimeKey === 'ally_2');
      ally2Rule.cost = 10;

      const twoAllies = makeBehavior({
        name: 'Two Allies Custom',
        mode: 'active',
        target: {
          type: 'ally',
          quantity: { mode: 'up_to', count: 2 },
        },
      });

      expect(calculateTechniqueStructuralCost([twoAllies], customCats)).toBe(10);
    });
  });

  describe('3. Radius / Area of Effect (5m=1, 10m=2, 20m=3, 50m=4, 100m=5)', () => {
    const expectedRadiusCosts: Array<{ meters: number; cost: number }> = [
      { meters: 5, cost: 1 },
      { meters: 10, cost: 2 },
      { meters: 20, cost: 3 },
      { meters: 50, cost: 4 },
      { meters: 100, cost: 5 },
    ];

    test('all 5 canonical radius sizes exist with exact canonical CE', () => {
      const areaCat = categories.find(c => c.id === 'core.area');
      expect(areaCat).toBeDefined();

      for (const expected of expectedRadiusCosts) {
        const option = findAreaOption(categories, expected.meters);
        expect(option, `Radius ${expected.meters}m should exist`).toBeDefined();
        expect(option?.cost, `Radius ${expected.meters}m should cost ${expected.cost} CE`).toBe(expected.cost);
      }
    });

    test('technique with damage 3D6 (5 CE) + radius 20m (3 CE) calculates exactly 8 CE', () => {
      const behavior = makeBehavior({
        name: 'Fire Nova',
        mode: 'active',
        target: {
          type: 'enemy',
          area: {
            shape: 'radius',
            sizeMeters: 20,
          },
        },
        effects: [
          {
            id: 'eff-1',
            type: 'damage',
            dice: '3D6',
          },
        ],
      });

      // damage 3D6 (5 CE) + area radius 20m (3 CE) = 8 CE
      const cost = calculateTechniqueStructuralCost([behavior], categories);
      expect(cost).toBe(8);
    });
  });

  describe('4. Selection Mode (All 0 CE)', () => {
    test('standard_priority, manual, and random selection modes all cost 0 CE', () => {
      const std = makeBehavior({
        name: 'Std Priority',
        mode: 'active',
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 2 },
          selectionMode: 'standard_priority',
        },
      });
      expect(calculateTechniqueStructuralCost([std], categories)).toBe(2);

      const manual = makeBehavior({
        name: 'Manual Select',
        mode: 'active',
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 2 },
          selectionMode: 'manual',
        },
      });
      expect(calculateTechniqueStructuralCost([manual], categories)).toBe(2);

      const random = makeBehavior({
        name: 'Random Select',
        mode: 'active',
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 2 },
          selectionMode: 'random',
        },
      });
      expect(calculateTechniqueStructuralCost([random], categories)).toBe(2);
    });
  });

  describe('5. Database as Source of Truth (Dynamic Configurable Costs)', () => {
    test('cost calculations adapt dynamically when admin customizes costs in database', () => {
      const customCategories = JSON.parse(JSON.stringify(categories));

      // Modify 2 enemies: 2 CE -> 99 CE
      const tcCat = customCategories.find((c: any) => c.id === 'core.target_count');
      const ruleEnemy2 = tcCat.rules.find((r: any) => r.runtimeKey === 'enemy_2');
      ruleEnemy2.cost = 99;

      // Modify 1 structure: 3 CE -> 15 CE
      const targetCat = customCategories.find((c: any) => c.id === 'core.target');
      const ruleStructure = targetCat.rules.find((r: any) => r.runtimeKey === 'structure');
      ruleStructure.cost = 15;

      // Modify Area 50m: 4 CE -> 20 CE
      const areaCat = customCategories.find((c: any) => c.id === 'core.area');
      const ruleArea50 = areaCat.rules.find((r: any) => r.runtimeKey === '50');
      ruleArea50.cost = 20;

      const behavior1 = makeBehavior({
        name: 'Custom Two Enemies',
        mode: 'active',
        target: { type: 'enemy', quantity: { mode: 'up_to', count: 2 } },
      });
      expect(calculateTechniqueStructuralCost([behavior1], customCategories)).toBe(99);

      const behavior2 = makeBehavior({
        name: 'Custom Structure',
        mode: 'active',
        target: { type: 'structure', quantity: { mode: 'exact', count: 1 } },
      });
      expect(calculateTechniqueStructuralCost([behavior2], customCategories)).toBe(15);

      const behavior3 = makeBehavior({
        name: 'Custom Area',
        mode: 'active',
        target: { type: 'enemy', area: { shape: 'radius', sizeMeters: 50 } },
      });
      expect(calculateTechniqueStructuralCost([behavior3], customCategories)).toBe(20);
    });
  });

  describe('6. Controlled One-Shot Migration (RULES-DATA-3B)', () => {
    test('migrateCanonicalCatalogRulesData3B reconciles target, target_count, area, range, selection_restriction and preserves custom user rules', () => {
      const initial = createCoreCategories();
      // Add custom user rule to target_count category
      const customUserRule = {
        id: 'custom.target_count.swarm_10',
        name: 'Enjambre (10 objetivos)',
        cost: 15,
        isAvailable: true,
        runtimeKey: 'swarm_10',
        ruleType: 'component' as const,
        component: {
          kind: 'target_count' as const,
          min: 1,
          max: 10,
        },
      };
      const modifiedInitial = initial.map(c => {
        if (c.id === 'core.target_count') {
          return { ...c, rules: [...c.rules, customUserRule] };
        }
        return c;
      });

      const migrated = migrateCanonicalCatalogRulesData3B(modifiedInitial);

      const tcCat = migrated.find(c => c.id === 'core.target_count');
      expect(tcCat).toBeDefined();

      // Custom rule is preserved
      const preservedCustom = tcCat?.rules.find(r => r.id === 'custom.target_count.swarm_10');
      expect(preservedCustom).toBeDefined();
      expect(preservedCustom?.cost).toBe(15);

      // Canonical rules exist
      const enemy2 = tcCat?.rules.find(r => r.runtimeKey === 'enemy_2');
      expect(enemy2).toBeDefined();
      expect(enemy2?.cost).toBe(2);

      const ally2 = tcCat?.rules.find(r => r.runtimeKey === 'ally_2');
      expect(ally2).toBeDefined();
      expect(ally2?.cost).toBe(3);
    });
  });
});

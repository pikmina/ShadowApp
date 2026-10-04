import { describe, it, expect } from 'vitest';
import { createCoreCategories } from '../coreRuleCatalog';
import { calculateTechniqueStructuralCost, getComplexityAdjustmentCost, type SystemMechanicsConfig } from '../systemMechanics';
import { createDefaultMechanicalBehavior, type MechanicalBehavior } from '../mechanicalBehavior';

describe('Complexity Adjustment CE for Techniques', () => {
  const coreCategories = createCoreCategories();

  const makeSimpleBehavior = (dice = '1d8'): MechanicalBehavior => ({
    ...createDefaultMechanicalBehavior('b1', 'active', 'Golpe Simple'),
    activation: { actionType: 'action', timing: 'immediate' },
    target: { type: 'enemy', quantity: { mode: 'exact', count: 1 }, range: { type: 'contact' } },
    effects: [{ id: 'eff1', type: 'damage', dice, damageType: 'fisico' }],
  });

  it('1 behavior has 0 CE complexity adjustment', () => {
    const adj = getComplexityAdjustmentCost(1, coreCategories);
    expect(adj.cost).toBe(0);

    const tech1 = [makeSimpleBehavior()];
    const cost = calculateTechniqueStructuralCost(tech1, coreCategories);
    // Standard action = 0, enemy single melee = 0, damage 1d8 = 3, complexity 1 = 0 => 3 CE
    expect(cost).toBe(3);
  });

  it('2 behaviors has +2 CE complexity adjustment', () => {
    const adj = getComplexityAdjustmentCost(2, coreCategories);
    expect(adj.cost).toBe(2);

    const tech2 = [makeSimpleBehavior('1d8'), makeSimpleBehavior('1d8')];
    const cost = calculateTechniqueStructuralCost(tech2, coreCategories);
    // Behavior 1 = 3 CE, Behavior 2 = 3 CE, Complexity (2 behaviors) = +2 CE => 8 CE
    expect(cost).toBe(8);
  });

  it('3 behaviors has +4 CE complexity adjustment', () => {
    const adj = getComplexityAdjustmentCost(3, coreCategories);
    expect(adj.cost).toBe(4);

    const tech3 = [makeSimpleBehavior('1d8'), makeSimpleBehavior('1d8'), makeSimpleBehavior('1d8')];
    const cost = calculateTechniqueStructuralCost(tech3, coreCategories);
    // Behavior 1 = 3 CE, Behavior 2 = 3 CE, Behavior 3 = 3 CE, Complexity (3 behaviors) = +4 CE => 13 CE
    expect(cost).toBe(13);
  });

  it('4 behaviors has +6 CE and 5+ behaviors has +8 CE', () => {
    const adj4 = getComplexityAdjustmentCost(4, coreCategories);
    expect(adj4.cost).toBe(6);

    const adj5 = getComplexityAdjustmentCost(5, coreCategories);
    expect(adj5.cost).toBe(8);

    const adj6 = getComplexityAdjustmentCost(6, coreCategories);
    expect(adj6.cost).toBe(8); // Falls back to 5+ tier
  });

  it('allows dynamic customization in System Rules', () => {
    // Modify the complexity adjustment category in a custom config
    const customConfig: SystemMechanicsConfig = coreCategories.map(cat => {
      if (cat.id === 'core.complexity_adjustment' || cat.coreKey === 'complexity_adjustment') {
        return {
          ...cat,
          rules: cat.rules.map(r => {
            if (r.id === 'core.complexity_adjustment.behaviors_2' || (r as any).runtimeKey === 'behaviors_2') {
              return { ...r, cost: 5 }; // Balance changed from 2 to 5 CE
            }
            return r;
          }),
        };
      }
      return cat;
    });

    const adj = getComplexityAdjustmentCost(2, customConfig);
    expect(adj.cost).toBe(5);

    const tech2 = [makeSimpleBehavior('1d8'), makeSimpleBehavior('1d8')];
    const cost = calculateTechniqueStructuralCost(tech2, customConfig);
    // 3 + 3 + 5 = 11 CE
    expect(cost).toBe(11);
  });

  it('returns 0 when behaviorCount is 0 or negative', () => {
    expect(getComplexityAdjustmentCost(0, coreCategories).cost).toBe(0);
    expect(getComplexityAdjustmentCost(-1, coreCategories).cost).toBe(0);
  });
});

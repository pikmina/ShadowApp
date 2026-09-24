import { describe, expect, test } from 'vitest';
import {
  createCoreCategories,
  migrateCoreCategories,
  validateCoreCategories,
  CORE_CATEGORIES,
  RETIRED_CORE_CATEGORIES,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findDamageOption,
  findHealingOption,
  findBarrierOption,
  findBonusOption,
  findPenaltyOption,
  findMaintenanceOption,
  findTargetCountOption,
  findHealthCostOption,
  validateBehaviorMechanicalValues,
} from '../systemMechanics';
import type { MechanicalBehavior } from '../mechanicalBehavior';

describe('TAREA 34.2 & 34.2.2 — Saneamiento y Consolidación de Categorías Mecánicas', () => {
  const categories = createCoreCategories();

  test('1. Validates sanitized canonical core categories list (29 active)', () => {
    expect(validateCoreCategories(categories)).toBe(true);
    expect(categories).toHaveLength(Object.keys(CORE_CATEGORIES).length);
    expect(categories).toHaveLength(29);

    // Verify retired categories are not present in active CORE_CATEGORIES
    for (const retiredKey of RETIRED_CORE_CATEGORIES) {
      expect(retiredKey in CORE_CATEGORIES).toBe(false);
      expect(categories.some(c => c.coreKey === retiredKey)).toBe(false);
    }

    // Verify active categories including health_cost
    expect('health_cost' in CORE_CATEGORIES).toBe(true);
    expect('bonus' in CORE_CATEGORIES).toBe(true);
    expect('penalty' in CORE_CATEGORIES).toBe(true);
    expect('maintenance' in CORE_CATEGORIES).toBe(true);
    expect('target_count' in CORE_CATEGORIES).toBe(true);
    expect('healing' in CORE_CATEGORIES).toBe(true);
    expect('damage' in CORE_CATEGORIES).toBe(true);
  });

  test('2. BONUS — attribute independence and exact validation', () => {
    // Both +2 FUE and +2 DES resolve the same generic rule core.bonus.2
    const bonusOptFUE = findBonusOption(categories, 2);
    const bonusOptDES = findBonusOption(categories, 2);
    expect(bonusOptFUE).toBeDefined();
    expect(bonusOptDES).toBeDefined();
    expect(bonusOptFUE?.ruleId).toBe('core.bonus.2');
    expect(bonusOptDES?.ruleId).toBe('core.bonus.2');

    // Validation accepts configured +1..+5, rejects unconfigured +6
    const bValid: MechanicalBehavior = {
      id: 'b_bonus_valid',
      name: 'Bono Válido',
      mode: 'active',
      conditions: [],
      conditionLogic: 'all',
      limitations: [],
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      effects: [
        { id: 'e1', type: 'attribute_modifier', attributeId: 'FUE', amount: 3, operation: 'add' },
        { id: 'e2', type: 'attribute_modifier', attributeId: 'DES', amount: 3, operation: 'add' }
      ]
    };
    expect(validateBehaviorMechanicalValues(bValid, categories).valid).toBe(true);

    const bInvalid: MechanicalBehavior = {
      id: 'b_bonus_invalid',
      name: 'Bono Inválido',
      mode: 'active',
      conditions: [],
      conditionLogic: 'all',
      limitations: [],
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      effects: [{ id: 'e1', type: 'attribute_modifier', attributeId: 'FUE', amount: 6, operation: 'add' }]
    };
    const invalidRes = validateBehaviorMechanicalValues(bInvalid, categories);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors[0]).toContain('+6');
  });

  test('3. PENALTY — attribute independence and exact validation', () => {
    // Both -2 INT and -2 VEL resolve the same generic rule core.penalty.2
    const penaltyOptINT = findPenaltyOption(categories, -2);
    const penaltyOptVEL = findPenaltyOption(categories, -2);
    expect(penaltyOptINT).toBeDefined();
    expect(penaltyOptVEL).toBeDefined();
    expect(penaltyOptINT?.ruleId).toBe('core.penalty.2');
    expect(penaltyOptVEL?.ruleId).toBe('core.penalty.2');

    // Validation accepts configured -1..-5, rejects unconfigured -8
    const bValid: MechanicalBehavior = {
      id: 'b_pen_valid',
      name: 'Pena Válida',
      mode: 'active',
      conditions: [],
      conditionLogic: 'all',
      limitations: [],
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      effects: [{ id: 'e1', type: 'attribute_modifier', attributeId: 'INT', amount: -2, operation: 'add' }]
    };
    expect(validateBehaviorMechanicalValues(bValid, categories).valid).toBe(true);

    const bInvalid: MechanicalBehavior = {
      id: 'b_pen_invalid',
      name: 'Pena Inválida',
      mode: 'active',
      conditions: [],
      conditionLogic: 'all',
      limitations: [],
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      effects: [{ id: 'e1', type: 'attribute_modifier', attributeId: 'INT', amount: -8, operation: 'add' }]
    };
    const invalidRes = validateBehaviorMechanicalValues(bInvalid, categories);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors[0]).toContain('-8');
  });

  test('4. HEALTH_COST — active core category and CE modification', () => {
    const customCats = structuredClone(categories);
    const hpCat = customCats.find(c => c.coreKey === 'health_cost')!;
    const rule2hp = hpCat.rules.find(r => r.id === 'core.health_cost.2')!;
    // Set customized CE reduction of -3 for sacrificing 2 HP
    rule2hp.cost = -3;

    const dmgCat = customCats.find(c => c.coreKey === 'damage')!;
    const rule2d6 = dmgCat.rules.find(r => r.name === '2D6')!;
    rule2d6.cost = 5;

    const behavior: MechanicalBehavior = {
      id: 'b_hp',
      name: 'Sacrificio',
      mode: 'active',
      conditions: [],
      conditionLogic: 'all',
      limitations: [],
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      effects: [
        { id: 'eff1', type: 'damage', dice: '2D6' },
        { id: 'eff2', type: 'resource_modifier', resourceId: 'SA', amount: -2, operation: 'add' }
      ]
    };

    // 5 (damage 2D6) + (-3 health_cost 2 HP) = 2 CE
    const cost = calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [behavior] }, customCats);
    expect(cost).toBe(2);

    // Invalid health cost (e.g. 99 HP) fails validation
    const invalidBehavior = {
      ...behavior,
      consequences: [{ type: 'hp_cost', amount: 99 }]
    };
    const invalidRes = validateBehaviorMechanicalValues(invalidBehavior, customCats);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors[0]).toContain('99 HP');
  });

  test('5. HEALING — expanded dice options and normalization', () => {
    // 3d6 normalizes to 3D6 and resolves
    const heal3d6 = findHealingOption(categories, '3d6', 'SA');
    expect(heal3d6).toBeDefined();
    expect(heal3d6?.dice).toBe('3D6');
    expect(heal3d6?.kind).toBe('dice');

    // 2d4 normalizes to 2D4 and resolves
    const heal2d4 = findHealingOption(categories, '2d4', 'SA');
    expect(heal2d4).toBeDefined();
    expect(heal2d4?.dice).toBe('2D4');

    // 3D8 is not configured and fails
    const heal3d8 = findHealingOption(categories, '3d8', 'SA');
    expect(heal3d8).toBeUndefined();

    const behaviorInvalid: MechanicalBehavior = {
      id: 'b_heal_invalid',
      name: 'Curación Inválida',
      mode: 'active',
      conditions: [],
      conditionLogic: 'all',
      limitations: [],
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      effects: [{ id: 'e1', type: 'healing', dice: '3D8', resourceId: 'SA' }]
    };
    const res = validateBehaviorMechanicalValues(behaviorInvalid, categories);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('3D8');
  });

  test('6. Independence of mechanical value and stamina cost (amount != staminaCost)', () => {
    const customCats = structuredClone(categories);
    const bonusCat = customCats.find(c => c.coreKey === 'bonus')!;
    const bonus3 = bonusCat.rules.find(r => r.id === 'core.bonus.3')!;
    // Configure bonus +3 to cost +7 CE (NOT 3 CE)
    bonus3.cost = 7;

    const behavior: MechanicalBehavior = {
      id: 'b_val_cost',
      name: 'Bono Desacoplado',
      mode: 'active',
      conditions: [],
      conditionLogic: 'all',
      limitations: [],
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      effects: [{ id: 'e1', type: 'attribute_modifier', attributeId: 'VOL', amount: 3, operation: 'add' }]
    };

    const cost = calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [behavior] }, customCats);
    expect(cost).toBe(7);
  });

  test('7. migrateCoreCategories preserves legacy customized bonus/penalty costs', () => {
    const legacyCats = structuredClone(categories);
    const bonusCat = legacyCats.find(c => c.coreKey === 'bonus')!;
    bonusCat.rules.push({
      id: 'core.bonus.fue2',
      name: '+2 FUE',
      cost: 9, // customized cost
      ruleType: 'cost_modifier',
      runtimeKey: 'fue2'
    } as any);

    const migrated = migrateCoreCategories(legacyCats);
    const migratedBonus = migrated.find(c => c.coreKey === 'bonus')!;
    const opt2 = migratedBonus.rules.find(r => r.id === 'core.bonus.2')!;
    expect(opt2.cost).toBe(9);
  });
});

import { expect, test, describe } from 'vitest';
import { calculateTotalCE, resolveLiveRule, getCELevel, MechanicalEffect, MechanicCategory } from '../mechanics';

describe('Legacy CE Calculation Characterization', () => {
  const dummyCategories: MechanicCategory[] = [
    {
      id: "cat_1",
      name: "Combat",
      rules: [
        { id: "rule_1", name: "Heavy Strike", cost: 3 }
      ]
    }
  ];

  test('deal_damage adds 2 CE', () => {
    const effects: MechanicalEffect[] = [{ _id: '1', type: 'deal_damage' }];
    expect(calculateTotalCE(effects, dummyCategories)).toBe(2);
  });

  test('apply_status adds 1 CE', () => {
    const effects: MechanicalEffect[] = [{ _id: '1', type: 'apply_status' }];
    expect(calculateTotalCE(effects, dummyCategories)).toBe(1);
  });

  test('modify_attribute adds value', () => {
    const effects: MechanicalEffect[] = [{ _id: '1', type: 'modify_attribute', value: "3" }];
    expect(calculateTotalCE(effects, dummyCategories)).toBe(3);
  });

  test('mechanic_rule uses live rule if found', () => {
    const effects: MechanicalEffect[] = [{ _id: '1', type: 'mechanic_rule', mechanicId: 'cat_1', ruleId: 'rule_1' }];
    expect(calculateTotalCE(effects, dummyCategories)).toBe(3);
  });

  test('mechanic_rule falls back to legacy cost if missing live rule', () => {
    const effects: MechanicalEffect[] = [{ _id: '1', type: 'mechanic_rule', mechanicId: 'cat_1', ruleId: 'rule_missing', cost: 5 }];
    expect(calculateTotalCE(effects, dummyCategories)).toBe(5);
  });

  test('combined effects', () => {
    const effects: MechanicalEffect[] = [
      { _id: '1', type: 'deal_damage' },
      { _id: '2', type: 'apply_status' },
      { _id: '3', type: 'modify_attribute', value: "2" },
      { _id: '4', type: 'mechanic_rule', mechanicId: 'cat_1', ruleId: 'rule_1' }
    ];
    // 2 + 1 + 2 + 3 = 8
    expect(calculateTotalCE(effects, dummyCategories)).toBe(8);
  });
});

import { describe, it, expect } from 'vitest';
import {
  createCoreCategories,
  getCoreCategoryContract,
  validateCoreCategoryInvariants,
  CORE_CATEGORY_CONTRACTS,
  type CoreCategoryKey
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  type SystemMechanicsConfig
} from '../systemMechanics';
import { createDefaultMechanicalBehavior } from '../mechanicalBehavior';

describe('CORE-FORMS-1: Core Category Contracts & Contextual Forms', () => {
  const coreCategories = createCoreCategories();

  describe('1. Core Category Contracts Classification & Invariants', () => {
    it('attribute/FUE has ce_adjustment contract and does not require MechanicalEffectDefinition', () => {
      const contract = getCoreCategoryContract({ coreKey: 'attribute', id: 'core.attribute' });
      expect(contract).toBeDefined();
      expect(contract?.kind).toBe('ce_adjustment');
      expect(contract?.ruleClass).toBe('cost_modifier');
      expect(contract?.ruleClassLabel).toBe('Ajuste de CE');
      expect(contract?.editorMode).toBe('parameter');

      const attrCat = coreCategories.find(c => c.coreKey === 'attribute');
      expect(attrCat).toBeDefined();
      const fueRule = attrCat?.rules.find(r => r.runtimeKey === 'FUE' || r.id.endsWith('.fue') || r.id.endsWith('.FUE'));
      expect(fueRule).toBeDefined();
      expect(fueRule?.cost).toBe(0);
      expect(fueRule?.ruleType).toBe('cost_modifier');
      expect((fueRule as any).effect).toBeUndefined();
    });

    it('derived_stat/EVA has ce_adjustment contract and does not require MechanicalEffectDefinition', () => {
      const contract = getCoreCategoryContract({ coreKey: 'derived_stat', id: 'core.derived_stat' });
      expect(contract).toBeDefined();
      expect(contract?.kind).toBe('ce_adjustment');
      expect(contract?.ruleClass).toBe('cost_modifier');
      expect(contract?.ruleClassLabel).toBe('Ajuste de CE');
      expect(contract?.editorMode).toBe('parameter');

      const statCat = coreCategories.find(c => c.coreKey === 'derived_stat');
      expect(statCat).toBeDefined();
      const evaRule = statCat?.rules.find(r => r.runtimeKey === 'EVA' || r.id.endsWith('.EVA'));
      expect(evaRule).toBeDefined();
      expect(evaRule?.cost).toBe(2);
      expect(evaRule?.ruleType).toBe('cost_modifier');
      expect((evaRule as any).effect).toBeUndefined();
    });

    it('numeric_modifier/+3 has ce_adjustment contract and does not require MechanicalEffectDefinition', () => {
      const contract = getCoreCategoryContract({ coreKey: 'numeric_modifier', id: 'core.numeric_modifier' });
      expect(contract).toBeDefined();
      expect(contract?.kind).toBe('ce_adjustment');
      expect(contract?.ruleClass).toBe('cost_modifier');
      expect(contract?.ruleClassLabel).toBe('Ajuste de CE');
      expect(contract?.editorMode).toBe('numeric_modifier');

      const numCat = coreCategories.find(c => c.coreKey === 'numeric_modifier');
      expect(numCat).toBeDefined();
      const mod3Rule = numCat?.rules.find(r => r.runtimeKey === '3' || r.name === '+3');
      expect(mod3Rule).toBeDefined();
      expect(mod3Rule?.cost).toBe(2);
      expect(mod3Rule?.ruleType).toBe('cost_modifier');
      expect((mod3Rule as any).effect).toBeUndefined();
    });

    it('damage/4D8 infers ruleClass effect and effect.type damage', () => {
      const contract = getCoreCategoryContract({ coreKey: 'damage', id: 'core.damage' });
      expect(contract).toBeDefined();
      expect(contract?.kind).toBe('effect');
      expect(contract?.ruleClass).toBe('effect');
      expect(contract?.effectType).toBe('damage');
      expect(contract?.editorMode).toBe('effect');

      const dmgCat = coreCategories.find(c => c.coreKey === 'damage');
      expect(dmgCat).toBeDefined();
      const rule4d8 = dmgCat?.rules.find(r => r.name === '4D8');
      expect(rule4d8).toBeDefined();
      expect(rule4d8?.ruleType).toBe('effect');
      expect(rule4d8?.effect?.type).toBe('damage');
    });

    it('healing category contract mandates effect.type healing', () => {
      const contract = getCoreCategoryContract({ coreKey: 'healing', id: 'core.healing' });
      expect(contract).toBeDefined();
      expect(contract?.effectType).toBe('healing');

      const healingCat = coreCategories.find(c => c.coreKey === 'healing');
      expect(healingCat).toBeDefined();
      for (const rule of healingCat?.rules || []) {
        expect(rule.ruleType).toBe('effect');
        expect(rule.effect?.type).toBe('healing');
      }
    });

    it('barrier category contract mandates effect.type barrier', () => {
      const contract = getCoreCategoryContract({ coreKey: 'barrier', id: 'core.barrier' });
      expect(contract).toBeDefined();
      expect(contract?.effectType).toBe('barrier');

      const barrierCat = coreCategories.find(c => c.coreKey === 'barrier');
      expect(barrierCat).toBeDefined();
      for (const rule of barrierCat?.rules || []) {
        expect(rule.ruleType).toBe('effect');
        expect(rule.effect?.type).toBe('barrier');
      }
    });
  });

  describe('2. Protection of Core Invariants against invalid configurations', () => {
    it('rejects healing category containing effect.type barrier', () => {
      const invalidCategories: SystemMechanicsConfig = [
        {
          id: 'core.healing',
          coreKey: 'healing',
          name: 'Curación',
          description: 'Curación',
          logicalType: 'support',
          scope: { techniques: true, objects: true, actions: true },
          rules: [
            {
              id: 'core.healing.invalid',
              name: 'Curación Rota',
              cost: 1,
              ruleType: 'effect',
              isAvailable: true,
              effect: {
                type: 'barrier',
                amount: 10,
              } as any,
            }
          ]
        }
      ];

      const validation = validateCoreCategoryInvariants(invalidCategories);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("tipo de efecto contradictorio 'barrier'"))).toBe(true);
    });

    it('rejects barrier category containing effect.type damage', () => {
      const invalidCategories: SystemMechanicsConfig = [
        {
          id: 'core.barrier',
          coreKey: 'barrier',
          name: 'Barrera',
          description: 'Barrera',
          logicalType: 'defensive',
          scope: { techniques: true, objects: true, actions: true },
          rules: [
            {
              id: 'core.barrier.invalid',
              name: 'Barrera Rota',
              cost: 1,
              ruleType: 'effect',
              isAvailable: true,
              effect: {
                type: 'damage',
                dice: '2D6',
              } as any,
            }
          ]
        }
      ];

      const validation = validateCoreCategoryInvariants(invalidCategories);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("tipo de efecto contradictorio 'damage'"))).toBe(true);
    });

    it('rejects ce_adjustment category containing an effect', () => {
      const invalidCategories: SystemMechanicsConfig = [
        {
          id: 'core.attribute',
          coreKey: 'attribute',
          name: 'Atributo',
          description: 'Atributo',
          logicalType: 'utility',
          scope: { techniques: true, objects: true, actions: true },
          rules: [
            {
              id: 'core.attribute.FUE',
              name: 'Fuerza',
              cost: 1,
              ruleType: 'effect',
              isAvailable: true,
              effect: {
                type: 'attribute_modifier',
                attributeId: 'FUE',
                amount: 0,
              } as any,
            }
          ]
        }
      ];

      const validation = validateCoreCategoryInvariants(invalidCategories);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('es un ajuste de CE y no puede definir un efecto mecánico'))).toBe(true);
    });

    it('custom category is not constrained by core category contracts and returns undefined contract', () => {
      const customCat = {
        id: 'custom.my_rules',
        name: 'Mis Reglas Personalizadas',
        logicalType: 'utility',
        scope: { techniques: true, objects: true, actions: true },
        rules: []
      };

      const contract = getCoreCategoryContract(customCat as any);
      expect(contract).toBeUndefined();

      const validation = validateCoreCategoryInvariants([customCat as any]);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('3. Obligatory Regression: EVA +3 Resolves Structural CE Correctly', () => {
    it('resolves CE for target EVA (+2 CE) + magnitude +3 (+2 CE) = 4 CE (+ base)', () => {
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
          },
        ],
      };

      const cost = calculateTechniqueStructuralCost(canonicalTechnique, coreCategories);
      
      // EVA cost = +2 CE
      // Numeric +3 cost = +2 CE
      // Total sum = 2 + 2 = 4 CE
      expect(cost).toBe(4);
    });

    it('resolves CE for FUE (+0 CE base or custom) + magnitude +2 (+1 CE) = 1 CE', () => {
      const canonicalTechnique = {
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

      const cost = calculateTechniqueStructuralCost(canonicalTechnique, coreCategories);
      
      // FUE cost = 0 CE
      // Numeric +2 cost = +1 CE
      // Total sum = 0 + 1 = 1 CE
      expect(cost).toBe(1);
    });
  });
});

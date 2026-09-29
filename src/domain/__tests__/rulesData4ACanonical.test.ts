import { describe, test, expect } from 'vitest';
import {
  createCoreCategories,
  getCategoryOptions,
  migrateCanonicalCatalogRulesData4A,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findActivationOption,
  findCooldownOption,
  findUsageOption,
  findManualConditionOption,
  findAdditionalRequirementOption,
  findConfiguredRule,
} from '../systemMechanics';
import { describeMechanicalBehavior } from '../mechanicalDescription';
import { type MechanicalBehavior } from '../mechanicalBehavior';

describe('RULES-DATA-4A — Requisitos y Limitantes Canónicos', () => {
  const categories = createCoreCategories();

  // =========================================================================
  // 1. INDIVIDUAL CANONICAL LIMITERS & REQUIREMENTS (10 CASES)
  // =========================================================================
  describe('1. 10 Casos Canónicos de Requisitos y Limitantes', () => {
    test('1. Consume 1 turno para activarse (delay1) => -1 CE', () => {
      const opt = findActivationOption(categories, 'delay1');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);

      const delayRules = getCategoryOptions(categories, 'activation');
      const delay1 = delayRules.find((r) => r.runtimeKey === 'delay1' || r.id === 'core.activation.delay1');
      expect(delay1).toBeDefined();
      expect(delay1?.cost).toBe(-1);

      const behavior: MechanicalBehavior = {
        id: 'b1',
        name: 'Técnica con Preparación',
        mode: 'active',
        activation: {
          actionType: 'action',
          timing: 'immediate',
          turns: 1,
          delay: 1,
          description: 'Consume 1 turno para activarse',
        },
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '4D8' }, // 7 CE
        ],
      };

      // 7 (4D8) + (-1 delay) = 6 CE
      const cost = calculateTechniqueStructuralCost([behavior], categories);
      expect(cost).toBe(6);
    });

    test('2. Contacto auditivo => -1 CE', () => {
      const opt = findManualConditionOption(categories, 'auditory_contact');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);

      const behavior: MechanicalBehavior = {
        id: 'b2',
        name: 'Grito de Mando',
        mode: 'active',
        conditions: [
          {
            type: 'manual',
            signalId: 'auditory_contact',
            description: 'Contacto auditivo',
          },
        ],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '2D6' }, // 3 CE
        ],
      };

      // 3 (2D6) + (-1 auditivo) = 2 CE
      expect(calculateTechniqueStructuralCost([behavior], categories)).toBe(2);
    });

    test('3. Contacto físico => -1 CE', () => {
      const opt = findManualConditionOption(categories, 'physical_contact');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);

      const behavior: MechanicalBehavior = {
        id: 'b3',
        name: 'Toque Eléctrico',
        mode: 'active',
        requirements: [
          {
            id: 'req_phys',
            type: 'physical_contact',
            description: 'Contacto físico',
          },
        ],
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // 5 CE
        ],
      };

      // 5 (3D6) + (-1 contacto físico) = 4 CE
      expect(calculateTechniqueStructuralCost([behavior], categories)).toBe(4);
    });

    test('4. Contacto visual => -1 CE', () => {
      const opt = findManualConditionOption(categories, 'visual_contact');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);

      const behavior: MechanicalBehavior = {
        id: 'b4',
        name: 'Mirada Intimidante',
        mode: 'active',
        requirements: [
          {
            id: 'req_vis',
            type: 'visual_contact',
            description: 'Contacto visual',
          },
        ],
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // 5 CE
        ],
      };

      // 5 (3D6) + (-1 visual) = 4 CE
      expect(calculateTechniqueStructuralCost([behavior], categories)).toBe(4);
    });

    test('5. Debe consumir algo (consumption / consume) => -1 CE', () => {
      const opt = findAdditionalRequirementOption(categories, 'consumption');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);

      const behavior: MechanicalBehavior = {
        id: 'b5',
        name: 'Metabolismo Sangriento',
        mode: 'active',
        conditions: [
          {
            type: 'consumption',
            description: 'Requiere consumir sangre del objetivo',
          } as any,
        ],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // 5 CE
        ],
      };

      // 5 (3D6) + (-1 consumir algo) = 4 CE
      expect(calculateTechniqueStructuralCost([behavior], categories)).toBe(4);
    });

    test('6. Cooldown 2 turnos => -2 CE (cooldown 1, 3, 4, 5 => 0 CE sin inventar)', () => {
      const opt2 = findCooldownOption(categories, 2);
      expect(opt2).toBeDefined();
      expect(opt2?.cost).toBe(-2);

      const opt1 = findCooldownOption(categories, 1);
      expect(opt1?.cost).toBe(0);

      const opt3 = findCooldownOption(categories, 3);
      expect(opt3?.cost).toBe(0);

      const opt4 = findCooldownOption(categories, 4);
      expect(opt4?.cost).toBe(0);

      const behaviorCd2: MechanicalBehavior = {
        id: 'b6',
        name: 'Golpe con Recarga',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [
          { id: 'l1', type: 'cooldown', turns: 2 },
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '4D6' }, // 5 CE
        ],
      };

      // 5 (4D6) + (-2 cooldown 2) = 3 CE
      expect(calculateTechniqueStructuralCost([behaviorCd2], categories)).toBe(3);
    });

    test('7. Debe hablar directamente al objetivo (speak_directly) => -1 CE', () => {
      const opt = findManualConditionOption(categories, 'speak_directly');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);

      const behavior: MechanicalBehavior = {
        id: 'b7',
        name: 'Comando Verbal',
        mode: 'active',
        conditions: [
          {
            type: 'manual',
            signalId: 'speak_directly',
            description: 'Debe hablar directamente al objetivo',
          },
        ],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // 5 CE
        ],
      };

      // 5 (3D6) + (-1 hablar directamente) = 4 CE
      expect(calculateTechniqueStructuralCost([behavior], categories)).toBe(4);
    });

    test('8. Debe tener otra habilidad activa (active_ability / active_behavior) => -2 CE', () => {
      const opt = findAdditionalRequirementOption(categories, 'active_ability');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-2);

      const behavior: MechanicalBehavior = {
        id: 'b8',
        name: 'Jet Burn',
        mode: 'active',
        conditions: [
          {
            type: 'active_behavior',
            behaviorId: 'postura_llamas',
            present: true,
          },
        ],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '4D6' }, // 5 CE
        ],
      };

      // 5 (4D6) + (-2 técnica activa) = 3 CE
      expect(calculateTechniqueStructuralCost([behavior], categories)).toBe(3);
    });

    test('9. 1 vez por combate/misión/día => -4 CE (1 por turno => 0 CE)', () => {
      const optCombat = findUsageOption(categories, 'combat');
      expect(optCombat?.cost).toBe(-4);

      const optMission = findUsageOption(categories, 'mission');
      expect(optMission?.cost).toBe(-4);

      const optDay = findUsageOption(categories, 'day');
      expect(optDay?.cost).toBe(-4);

      const optTurn = findUsageOption(categories, 'turn');
      expect(optTurn?.cost).toBe(0);

      const behaviorCombat: MechanicalBehavior = {
        id: 'b9a',
        name: 'Remate Final',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [
          { id: 'l1', type: 'usage_limit', period: 'combat', max: 1 },
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '4D8' }, // 7 CE
        ],
      };

      // 7 (4D8) + (-4 1 vez por combate) = 3 CE
      expect(calculateTechniqueStructuralCost([behaviorCombat], categories)).toBe(3);
    });

    test('10. Objetivo debe estar consciente (conscious / target_conscious) => -2 CE', () => {
      const opt = findManualConditionOption(categories, 'conscious');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-2);

      const behavior: MechanicalBehavior = {
        id: 'b10',
        name: 'Extracción Mental',
        mode: 'active',
        conditions: [
          {
            type: 'conscious',
            conscious: true,
          },
        ],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // 5 CE
        ],
      };

      // 5 (3D6) + (-2 consciente) = 3 CE
      expect(calculateTechniqueStructuralCost([behavior], categories)).toBe(3);
    });
  });

  // =========================================================================
  // 2. COMPOSITE COMBINED TECHNIQUES
  // =========================================================================
  describe('2. Combinaciones de Técnicas Canónicas Compuestas', () => {
    test('A. 4D8 (7 CE) + delay 1 turno (-1 CE) => 6 CE', () => {
      const b: MechanicalBehavior = {
        id: 'b_delayed_attack',
        name: 'Granada de Tiempo',
        mode: 'active',
        activation: {
          actionType: 'action',
          timing: 'immediate',
          turns: 1,
          delay: 1,
        },
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '4D8' }, // 7 CE
        ],
      };

      expect(calculateTechniqueStructuralCost([b], categories)).toBe(6);
    });

    test('B. 3D6 (5 CE) + physical contact (-1 CE) + conscious target (-2 CE) => 2 CE', () => {
      const b: MechanicalBehavior = {
        id: 'b_drain',
        name: 'Drenaje Vital',
        mode: 'active',
        requirements: [
          { id: 'req1', type: 'physical_contact', description: 'Contacto físico' }, // -1 CE
          { id: 'req2', type: 'target_conscious', description: 'Objetivo consciente' }, // -2 CE
        ],
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // 5 CE
        ],
      };

      // 5 - 1 - 2 = 2 CE
      expect(calculateTechniqueStructuralCost([b], categories)).toBe(2);
    });

    test('C. Copycat: 3D6 (5 CE) + consumption requirement (-1 CE) => 4 CE', () => {
      const b: MechanicalBehavior = {
        id: 'b_copycat',
        name: 'Copycat',
        mode: 'active',
        conditions: [
          {
            type: 'manual',
            signalId: 'consume_something',
            description: 'Requiere consumir sangre del objetivo',
          },
        ],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // 5 CE
        ],
      };

      expect(calculateTechniqueStructuralCost([b], categories)).toBe(4);

      const desc = describeMechanicalBehavior(b);
      expect(desc.text.toLowerCase()).toContain('consumir');
    });

    test('C2. Copycat Completo: Transformation corporal (+1) + Duration 5 turns (+4) + Consumption (-1) + Cooldown 2 turns (-2) => 2 CE', () => {
      const b: MechanicalBehavior = {
        id: 'b_copycat_full',
        name: 'Copycat Transformación',
        mode: 'active',
        conditions: [
          {
            type: 'consumption',
            description: 'Requiere consumir sangre del objetivo',
          } as any,
        ],
        conditionLogic: 'all',
        temporality: {
          duration: { type: 'turns', turns: 5 }, // +4 CE
        },
        limitations: [
          { id: 'lim1', type: 'cooldown', turns: 2 }, // -2 CE
        ],
        effects: [
          { id: 'e1', type: 'transformation', magnitude: { type: 'body', value: 1 } }, // +1 CE
        ],
      };

      // 1 (transformación corporal) + 4 (duración 5 turnos) - 1 (consumir) - 2 (cooldown 2 turnos) = 2 CE
      expect(calculateTechniqueStructuralCost([b], categories)).toBe(2);
    });

    test('D. Orden de operaciones: componentes positivos y negativos se componen antes del clamp a 0', () => {
      const bPositiveNegatives: MechanicalBehavior = {
        id: 'b_comp',
        name: 'Ataque con Limitantes',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        requirements: [
          { id: 'r1', type: 'physical_contact', description: 'Contacto físico' }, // -1 CE
          { id: 'r2', type: 'target_conscious', description: 'Objetivo consciente' }, // -2 CE
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // +5 CE
        ],
      };
      // 5 - 1 - 2 = 2 CE
      expect(calculateTechniqueStructuralCost([bPositiveNegatives], categories)).toBe(2);

      const bOnlyNegatives: MechanicalBehavior = {
        id: 'b_neg_only',
        name: 'Solo Limitantes',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [],
        requirements: [
          { id: 'r1', type: 'physical_contact', description: 'Contacto físico' }, // -1 CE
          { id: 'r2', type: 'target_conscious', description: 'Objetivo consciente' }, // -2 CE
        ],
      };
      // -1 + -2 = -3 CE raw subtotal -> clamped to 0 CE effective
      expect(calculateTechniqueStructuralCost([bOnlyNegatives], categories)).toBe(0);
    });

    test('E. Técnica compleja con múltiples limitantes no baja de 0 CE', () => {
      const b: MechanicalBehavior = {
        id: 'b_over_limited',
        name: 'Poder Sellado',
        mode: 'active',
        activation: {
          actionType: 'action',
          timing: 'immediate',
          turns: 1,
          delay: 1, // -1 CE
        },
        requirements: [
          { id: 'req1', type: 'physical_contact', description: 'Contacto físico' }, // -1 CE
        ],
        conditions: [
          { type: 'conscious', conscious: true }, // -2 CE
        ],
        conditionLogic: 'all',
        limitations: [
          { id: 'l1', type: 'cooldown', turns: 2 }, // -2 CE
          { id: 'l2', type: 'usage_limit', period: 'combat', max: 1 }, // -4 CE
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '2D6' }, // 3 CE
        ],
      };

      // 3 - 1 - 1 - 2 - 2 - 4 = -7 => clamped to 0 CE
      expect(calculateTechniqueStructuralCost([b], categories)).toBe(0);
    });
  });

  // =========================================================================
  // 3. DATABASE MIGRATION AND IDEMPOTENCY (RULES-DATA-4A)
  // =========================================================================
  describe('3. Migración Canónica RULES-DATA-4A y Preservación de Reglas Personalizadas', () => {
    test('migrateCanonicalCatalogRulesData4A reconciles activation, cooldown, usage, manual_condition, additional_requirement and preserves custom user rules', () => {
      const initial = createCoreCategories();

      // Simulate modified/legacy catalog with custom rules
      const modifiedInitial = initial.map((cat) => {
        if (cat.id === 'core.manual_condition') {
          return {
            ...cat,
            rules: [
              ...cat.rules.map((r) => ({ ...r, cost: 0 })), // old 0 cost
              {
                id: 'custom.manual_condition.stealth',
                name: 'Modo Sigilo',
                cost: -3,
                runtimeKey: 'stealth',
                ruleType: 'component' as const,
                component: {
                  kind: 'condition' as const,
                  role: 'requirement' as const,
                  match: 'all' as const,
                  predicates: [{ kind: 'manual' as const, signalId: 'stealth' }],
                },
              },
            ],
          };
        }
        if (cat.id === 'core.usage') {
          return {
            ...cat,
            rules: [
              ...cat.rules.map((r) => ({ ...r, cost: 0 })), // old 0 cost
              {
                id: 'custom.usage.boss_combat',
                name: '1 por combate contra boss',
                cost: -10,
                runtimeKey: 'boss_combat',
                ruleType: 'component' as const,
                component: {
                  kind: 'usage' as const,
                  period: 'combat' as const,
                  max: 1,
                },
              },
            ],
          };
        }
        return cat;
      });

      const migrated = migrateCanonicalCatalogRulesData4A(modifiedInitial);

      // 1. Verify custom rules were preserved
      const customCond = migrated.find((c) => c.id === 'core.manual_condition')?.rules.find((r) => r.id === 'custom.manual_condition.stealth');
      expect(customCond).toBeDefined();
      expect(customCond?.cost).toBe(-3);

      const customUsage = migrated.find((c) => c.id === 'core.usage')?.rules.find((r) => r.id === 'custom.usage.boss_combat');
      expect(customUsage).toBeDefined();
      expect(customUsage?.cost).toBe(-10);

      // 2. Verify canonical rules received canonical values
      const manualCat = migrated.find((c) => c.id === 'core.manual_condition');
      expect(manualCat?.rules.find((r) => r.id === 'core.manual_condition.physical_contact')?.cost).toBe(-1);
      expect(manualCat?.rules.find((r) => r.id === 'core.manual_condition.visual_contact')?.cost).toBe(-1);
      expect(manualCat?.rules.find((r) => r.id === 'core.manual_condition.auditory_contact')?.cost).toBe(-1);
      expect(manualCat?.rules.find((r) => r.id === 'core.manual_condition.speak_directly')?.cost).toBe(-1);
      expect(manualCat?.rules.find((r) => r.id === 'core.manual_condition.conscious')?.cost).toBe(-2);

      const usageCat = migrated.find((c) => c.id === 'core.usage');
      expect(usageCat?.rules.find((r) => r.id === 'core.usage.combat')?.cost).toBe(-4);
      expect(usageCat?.rules.find((r) => r.id === 'core.usage.mission')?.cost).toBe(-4);
      expect(usageCat?.rules.find((r) => r.id === 'core.usage.day')?.cost).toBe(-4);
      expect(usageCat?.rules.find((r) => r.id === 'core.usage.turn')?.cost).toBe(0);

      const actCat = migrated.find((c) => c.id === 'core.activation');
      expect(actCat?.rules.find((r) => r.id === 'core.activation.delay1')?.cost).toBe(-1);

      const cdCat = migrated.find((c) => c.id === 'core.cooldown');
      expect(cdCat?.rules.find((r) => r.id === 'core.cooldown.2')?.cost).toBe(-2);
      expect(cdCat?.rules.find((r) => r.id === 'core.cooldown.1')?.cost).toBe(0);

      const addReqCat = migrated.find((c) => c.id === 'core.additional_requirement');
      expect(addReqCat?.rules.find((r) => r.id === 'core.additional_requirement.consumption')?.cost).toBe(-1);
      expect(addReqCat?.rules.find((r) => r.id === 'core.additional_requirement.active_ability')?.cost).toBe(-2);
    });

    test('DATABASE = SOURCE OF TRUTH: Admin edits to canonical rule costs are respected by calculateTechniqueStructuralCost', () => {
      const customCategories = createCoreCategories().map((cat) => {
        if (cat.id === 'core.manual_condition') {
          return {
            ...cat,
            rules: cat.rules.map((r) => {
              if (r.id === 'core.manual_condition.physical_contact') {
                return { ...r, cost: -5 }; // Admin changed physical contact to -5 CE
              }
              return r;
            }),
          };
        }
        return cat;
      });

      const behavior: MechanicalBehavior = {
        id: 'b_custom_admin',
        name: 'Golpe Personalizado',
        mode: 'active',
        requirements: [
          { id: 'req_custom', type: 'physical_contact', description: 'Contacto físico personalizado' },
        ],
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          { id: 'e1', type: 'damage', dice: '4D8' }, // 7 CE
        ],
      };

      // 7 (4D8) + (-5 admin override) = 2 CE
      expect(calculateTechniqueStructuralCost([behavior], customCategories)).toBe(2);
    });
  });
});

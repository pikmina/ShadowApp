import { describe, it, expect } from 'vitest';
import { evaluateSingleCondition, ConditionEvaluationContext, ParticipantRuntimeState, RuleEntityState } from '../mechanicalRuntime';
import { evaluateRequirements, RequirementGroup, RequirementContext } from '../requirements';
import { MECHANICAL_BEHAVIOR_GROUPS, getCategoryGroupKey } from '../../components/mechanics/UniversalRulesCatalog';
import { MechanicalCondition } from '../mechanicalBehavior';

function createMockEntity(overrides: Partial<RuleEntityState> = {}): RuleEntityState {
  return {
    id: 'char_1',
    name: 'Hero',
    attributes: {},
    resources: { SA: { current: 20, max: 20 }, ES: { current: 20, max: 20 } },
    barrier: 0,
    statuses: [],
    equippedItems: [],
    inventory: {},
    modifiers: [],
    ...overrides,
  };
}

function createMockParticipant(overrides: Partial<ParticipantRuntimeState> = {}): ParticipantRuntimeState {
  return {
    entityId: 'char_1',
    currentTurn: 1,
    damageReceivedThisTurn: 0,
    damageDealtThisTurn: 0,
    esSpentThisTurn: 0,
    esRecoveredThisTurn: 0,
    hpLostThisTurn: 0,
    hpRecoveredThisTurn: 0,
    usedQuirkPreviousTurn: false,
    usedQuirkThisTurn: false,
    consecutiveTurnsQuirkUsed: 0,
    activeTimedEffects: [],
    activeCounters: {},
    pendingModifiers: [],
    cooldowns: {},
    usageCounters: {},
    reservedInventory: {},
    executedBehaviorEvents: [],
    ...overrides,
  };
}

describe('Audit & Recovery of Mechanical Conditions (Fase de Condiciones)', () => {
  describe('1. Category Unification («Condiciones»)', () => {
    it('unifies manual_condition, additional_requirement, and related categories under conditions group', () => {
      const conditionsGroup = MECHANICAL_BEHAVIOR_GROUPS.find((g) => g.key === 'conditions');
      expect(conditionsGroup).toBeDefined();
      expect(conditionsGroup?.title).toContain('Condiciones');
      expect(conditionsGroup?.coreKeys).toContain('manual_condition');
      expect(conditionsGroup?.coreKeys).toContain('additional_requirement');
      expect(conditionsGroup?.coreKeys).toContain('resource_threshold');

      // Verify category grouping function
      const cat1 = {
        id: 'core.manual_condition',
        coreKey: 'manual_condition',
        name: 'Condición manual',
        description: 'Condiciones manuales',
        logicalType: 'utility' as const,
        scope: { techniques: true, objects: true, actions: true },
        rules: [],
      };
      const cat2 = {
        id: 'core.additional_requirement',
        coreKey: 'additional_requirement',
        name: 'Requisito adicional',
        description: 'Requisitos adicionales',
        logicalType: 'utility' as const,
        scope: { techniques: true, objects: true, actions: true },
        rules: [],
      };

      expect(getCategoryGroupKey(cat1)).toBe('conditions');
      expect(getCategoryGroupKey(cat2)).toBe('conditions');
    });
  });

  describe('2. "Requiere Técnica Activa" (Learned Technique) Evaluation', () => {
    it('evaluates active_ability / learned_technique as true when character possesses the learned technique', () => {
      const cond: MechanicalCondition = {
        type: 'active_ability',
        abilityId: 'tech_fireball_01',
      };

      const mockCtx: ConditionEvaluationContext = {
        entity: createMockEntity(),
        participant: createMockParticipant({
          learnedTechniqueIds: ['tech_fireball_01', 'tech_dash_02'],
        }),
      };

      expect(evaluateSingleCondition(cond, mockCtx)).toBe(true);
    });

    it('evaluates active_ability / learned_technique as false when character lacks the learned technique', () => {
      const cond: MechanicalCondition = {
        type: 'active_ability',
        abilityId: 'tech_ice_wall_03',
      };

      const mockCtx: ConditionEvaluationContext = {
        entity: createMockEntity(),
        participant: createMockParticipant({
          learnedTechniqueIds: ['tech_fireball_01'],
        }),
      };

      expect(evaluateSingleCondition(cond, mockCtx)).toBe(false);
    });

    it('evaluates requirementGroup for active_ability in domain requirements evaluator', () => {
      const group: RequirementGroup = {
        operator: 'all',
        requirements: [
          { type: 'active_ability', abilityId: 'tech_lightning_strike' },
        ],
      };

      const reqCtxValid: RequirementContext = {
        profile: {},
        possessions: new Map(),
        learnedTechniqueIds: ['tech_lightning_strike', 'tech_shield'],
      };

      const reqCtxInvalid: RequirementContext = {
        profile: {},
        possessions: new Map(),
        learnedTechniqueIds: ['tech_shield'],
      };

      expect(evaluateRequirements(group, reqCtxValid).passed).toBe(true);
      expect(evaluateRequirements(group, reqCtxInvalid).passed).toBe(false);
    });
  });

  describe('3. "Requiere Habilidad" & "Nivel de Habilidad" Evaluation', () => {
    it('evaluates skill_level as true when skill level is greater than or equal to required minimum level', () => {
      const cond: MechanicalCondition = {
        type: 'skill_level',
        skillElementId: 'skill_stealth_01',
        comparison: '>=',
        value: 3,
      };

      const entity = createMockEntity({
        inventory: { skill_stealth_01: 3 },
      });
      (entity as any).possessions = new Map([
        ['skill_stealth_01', { quantity: 1, level: 3, selectedChoices: { level: 3 } }],
      ]);

      const mockCtx: ConditionEvaluationContext = {
        entity,
        participant: createMockParticipant(),
      };

      expect(evaluateSingleCondition(cond, mockCtx)).toBe(true);
    });

    it('evaluates skill_level as false when skill level is below required minimum level or missing', () => {
      const cond: MechanicalCondition = {
        type: 'skill_level',
        skillElementId: 'skill_stealth_01',
        comparison: '>=',
        value: 4,
      };

      const entity = createMockEntity({
        inventory: { skill_stealth_01: 2 },
      });
      (entity as any).possessions = new Map([
        ['skill_stealth_01', { quantity: 1, level: 2, selectedChoices: { level: 2 } }],
      ]);

      const mockCtx: ConditionEvaluationContext = {
        entity,
        participant: createMockParticipant(),
      };

      expect(evaluateSingleCondition(cond, mockCtx)).toBe(false);
    });

    it('evaluates skill_level in requirementGroup against RequirementContext possessions', () => {
      const group: RequirementGroup = {
        operator: 'all',
        requirements: [
          { type: 'skill_level', skillElementId: 'skill_first_aid', comparison: '>=', value: 2 },
        ],
      };

      const reqCtxPass: RequirementContext = {
        profile: {},
        possessions: new Map([
          ['skill_first_aid', { quantity: 1, level: 2, selectedChoices: { level: 2 } }],
        ]),
      };

      const reqCtxFail: RequirementContext = {
        profile: {},
        possessions: new Map([
          ['skill_first_aid', { quantity: 1, level: 1, selectedChoices: { level: 1 } }],
        ]),
      };

      expect(evaluateRequirements(group, reqCtxPass).passed).toBe(true);
      expect(evaluateRequirements(group, reqCtxFail).passed).toBe(false);
    });
  });

  describe('4. Legacy Compatibility for Manual & Additional Conditions', () => {
    it('evaluates legacy manual signal condition correctly', () => {
      const cond: MechanicalCondition = {
        type: 'manual',
        signalId: 'speak_directly',
      };

      const mockCtxMatch: ConditionEvaluationContext = {
        entity: createMockEntity(),
        participant: createMockParticipant(),
        signals: ['speak_directly', 'visual_contact'],
      };

      const mockCtxNoMatch: ConditionEvaluationContext = {
        entity: createMockEntity(),
        participant: createMockParticipant(),
        signals: ['visual_contact'],
      };

      expect(evaluateSingleCondition(cond, mockCtxMatch)).toBe(true);
      expect(evaluateSingleCondition(cond, mockCtxNoMatch)).toBe(false);
    });
  });
});

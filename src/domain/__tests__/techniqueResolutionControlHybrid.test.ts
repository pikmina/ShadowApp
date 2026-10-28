import { describe, it, expect } from 'vitest';
import {
  deriveEffectiveBehaviorResolution,
  deriveTechniqueRollContract,
  deriveTechniqueFunctionalCategories,
  isMentalAlteredStatus,
  deriveEffectTargetDefense,
  type CharacterTechnique,
} from '../characterTechnique';
import {
  executeMechanicalBehavior,
  executeMultiTargetBehavior,
  resolveTargetDefenseValue,
  createParticipantRuntimeState,
  createEncounterRuntimeState,
} from '../mechanicalRuntime';
import type { RuleWorld } from '../ruleExecution';
import { createDefaultMechanicalBehavior, type MechanicalBehavior } from '../mechanicalBehavior';

describe('ShadowApp — Corrección de Resolución de Técnicas de Control e Híbridas', () => {
  // Helper to construct a clean behavior
  const makeBehavior = (partial: Partial<MechanicalBehavior> & { id: string }): MechanicalBehavior => ({
    ...createDefaultMechanicalBehavior(partial.id),
    ...partial,
  });

  // =========================================================================
  // 1. CANONICAL CLASSIFICATION OF MENTAL VS NON-MENTAL ALTERED STATUSES
  // =========================================================================
  describe('1. Canonical Altered Status Classification (Mental vs Non-Mental)', () => {
    it('identifies canonical mental statuses as psychic / courage defense', () => {
      const mentalStatuses = [
        'core.status.berserker',
        'core.status.coma_ilusorio',
        'core.status.concentrado',
        'core.status.desorientado',
        'core.status.locura',
        'core.status.miedo',
        'locura',
        'miedo',
      ];
      for (const id of mentalStatuses) {
        expect(isMentalAlteredStatus(id)).toBe(true);
        expect(deriveEffectTargetDefense({ type: 'status_apply', statusElementId: id })).toBe('COR');
      }
    });

    it('identifies non-mental statuses as physical / sensory / motor (evasion defense)', () => {
      const nonMentalStatuses = [
        'core.status.stunned',
        'core.status.asfixia',
        'core.status.congelado',
        'core.status.conmocion',
        'core.status.desbalanceado',
        'core.status.dormido',
        'core.status.electrocutado',
        'core.status.hemorragia',
        'core.status.inmovilizado',
        'core.status.quemadura',
        'core.status.ralentizado',
        'core.status.sobrecalentado',
        'core.status.veneno',
      ];
      for (const id of nonMentalStatuses) {
        expect(isMentalAlteredStatus(id)).toBe(false);
        expect(deriveEffectTargetDefense({ type: 'status_apply', statusElementId: id })).toBe('EVA');
      }
    });
  });

  // =========================================================================
  // 2. CONTROL TECHNIQUES RESOLUTION
  // =========================================================================
  describe('2. Control Techniques Resolution', () => {
    it('derives opposed roll vs Evasión (EVA) for non-mental altered status without automatic resolution fallthrough', () => {
      const behavior = makeBehavior({
        id: 'bh_stun',
        target: { type: 'character' },
        effects: [
          {
            id: 'eff_stun',
            type: 'status_apply',
            statusElementId: 'core.status.stunned',
            turns: 1,
          },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'control' });
      expect(res.type).toBe('roll');
      expect(res.requiresRoll).toBe(true);
      expect(res.attackType).toBe('physical');
      expect(res.targetDefense).toBe('EVA');
      expect(res.oppositionKind).toBe('target_evasion');
      expect(res.oppositionLabel).toBe('Evasión');
      expect(res.summaryLabel).toBe('Acción (ACC) vs Evasión');
    });

    it('derives opposed roll vs Coraje (COR) for mental altered status (e.g. locura / miedo)', () => {
      const behavior = makeBehavior({
        id: 'bh_fear',
        target: { type: 'character' },
        effects: [
          {
            id: 'eff_fear',
            type: 'status_apply',
            statusElementId: 'core.status.miedo',
            turns: 2,
          },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'control' });
      expect(res.type).toBe('roll');
      expect(res.requiresRoll).toBe(true);
      expect(res.attackType).toBe('mental');
      expect(res.targetDefense).toBe('COR');
      expect(res.oppositionKind).toBe('target_courage');
      expect(res.oppositionLabel).toBe('Coraje');
      expect(res.summaryLabel).toBe('Acción (ACC) vs Coraje');
    });

    it('derives roll vs Evasión for motor / movement altered status (e.g. ralentizado / inmovilizado)', () => {
      const behavior = makeBehavior({
        id: 'bh_slow',
        target: { type: 'character' },
        effects: [
          {
            id: 'eff_slow',
            type: 'status_apply',
            statusElementId: 'core.status.ralentizado',
            turns: 2,
          },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'control' });
      expect(res.type).toBe('roll');
      expect(res.targetDefense).toBe('EVA');
      expect(res.oppositionLabel).toBe('Evasión');
      expect(res.summaryLabel).toBe('Acción (ACC) vs Evasión');
    });

    it('preserves automatic resolution for control behaviors that do not apply damage or altered status', () => {
      const behavior = makeBehavior({
        id: 'bh_control_utility',
        effects: [
          {
            id: 'eff_act_block',
            type: 'action_block',
            blockedAction: 'attack',
            duration: 1,
          },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'control' });
      expect(res.type).toBe('automatic');
      expect(res.requiresRoll).toBe(false);
      expect(res.summaryLabel).toBe('Automática (Sin tirada)');
    });
  });

  // =========================================================================
  // 3. HYBRID TECHNIQUES RESOLUTION
  // =========================================================================
  describe('3. Hybrid Techniques Resolution', () => {
    it('derives opposed roll vs Evasión for damage directed at a character', () => {
      const behavior = makeBehavior({
        id: 'bh_dmg',
        target: { type: 'character' },
        effects: [{ id: 'eff_dmg', type: 'damage', dice: '2D6', damageType: 'fisico' }],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'hybrid' });
      expect(res.type).toBe('roll');
      expect(res.requiresRoll).toBe(true);
      expect(res.targetDefense).toBe('EVA');
      expect(res.oppositionLabel).toBe('Evasión');
    });

    it('derives opposed roll vs Evasión for non-mental altered status in a hybrid technique', () => {
      const behavior = makeBehavior({
        id: 'bh_freeze',
        target: { type: 'character' },
        effects: [
          {
            id: 'eff_freeze',
            type: 'status_apply',
            statusElementId: 'core.status.congelado',
            turns: 2,
          },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'hybrid' });
      expect(res.type).toBe('roll');
      expect(res.targetDefense).toBe('EVA');
      expect(res.oppositionLabel).toBe('Evasión');
    });

    it('derives opposed roll vs Coraje for mental altered status in a hybrid technique', () => {
      const behavior = makeBehavior({
        id: 'bh_desorientado',
        target: { type: 'character' },
        effects: [
          {
            id: 'eff_desor',
            type: 'status_apply',
            statusElementId: 'core.status.desorientado',
            turns: 1,
          },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'hybrid' });
      expect(res.type).toBe('roll');
      expect(res.targetDefense).toBe('COR');
      expect(res.oppositionLabel).toBe('Coraje');
    });

    it('single behavior combining non-mental damage and non-mental status resolves vs Evasión', () => {
      const behavior = makeBehavior({
        id: 'bh_fire_burn',
        target: { type: 'character' },
        effects: [
          { id: 'eff_dmg', type: 'damage', dice: '2D6', damageType: 'fuego' },
          { id: 'eff_burn', type: 'status_apply', statusElementId: 'core.status.quemadura', turns: 2 },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'hybrid' });
      expect(res.type).toBe('roll');
      expect(res.targetDefense).toBe('EVA');
      expect(res.oppositionLabel).toBe('Evasión');
    });

    it('single behavior combining damage and mental status: mental component requires Coraje', () => {
      const behavior = makeBehavior({
        id: 'bh_terror_strike',
        target: { type: 'character' },
        effects: [
          { id: 'eff_dmg', type: 'damage', dice: '2D6', damageType: 'fisico' },
          { id: 'eff_fear', type: 'status_apply', statusElementId: 'core.status.miedo', turns: 2 },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'hybrid' });
      expect(res.type).toBe('roll');
      expect(res.targetDefense).toBe('COR');
      expect(res.oppositionLabel).toBe('Coraje');
      expect(res.attackType).toBe('mental');
    });

    it('hybrid technique with separate behaviors: attack resolves vs defense, pure support behavior resolves without opposed roll', () => {
      const attackBehavior = makeBehavior({
        id: 'bh_att',
        target: { type: 'character' },
        effects: [{ id: 'eff_dmg', type: 'damage', dice: '3D6' }],
      });
      const supportBehavior = makeBehavior({
        id: 'bh_heal',
        target: { type: 'self' },
        effects: [{ id: 'eff_heal', type: 'healing', resourceId: 'SA', amount: 5 }],
      });

      const resAtt = deriveEffectiveBehaviorResolution(attackBehavior, { classification: 'hybrid' });
      const resHeal = deriveEffectiveBehaviorResolution(supportBehavior, { classification: 'hybrid' });

      // Attack behavior is opposed roll vs Evasión
      expect(resAtt.type).toBe('roll');
      expect(resAtt.targetDefense).toBe('EVA');

      // Pure support behavior does NOT become opposed attack
      expect(resHeal.type).toBe('automatic');
      expect(resHeal.requiresRoll).toBe(false);
      expect(resHeal.targetDefense).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. MULTIPLE BEHAVIORS AND CONTRACT GENERATION
  // =========================================================================
  describe('4. Technique Contract and Multi-Behavior Composition', () => {
    it('generates accurate roll contracts for a hybrid technique with distinct defense requirements', () => {
      const tech: CharacterTechnique = {
        id: 'tech_hybrid_master',
        characterId: 1,
        name: 'Golpe Espectral y Bálsamo',
        description: '',
        level: 2,
        sourceType: 'quirk',
        classification: 'hybrid',
        activationAttributeId: 'INT',
        revision: 1,
        mechanicalBehaviors: [
          // Behavior 1: Physical attack vs Evasión
          makeBehavior({
            id: 'b1',
            name: 'Corte Fantasmal',
            target: { type: 'character' },
            effects: [{ id: 'e1', type: 'damage', dice: '2D6' }],
          }),
          // Behavior 2: Mental curse vs Coraje
          makeBehavior({
            id: 'b2',
            name: 'Susurro Aterrador',
            target: { type: 'character' },
            effects: [{ id: 'e2', type: 'status_apply', statusElementId: 'core.status.miedo', turns: 2 }],
          }),
          // Behavior 3: Self-regeneration (support)
          makeBehavior({
            id: 'b3',
            name: 'Regeneración Etérea',
            target: { type: 'self' },
            effects: [{ id: 'e3', type: 'healing', resourceId: 'SA', amount: 4 }],
          }),
        ],
      };

      const contract = deriveTechniqueRollContract(tech);
      expect(contract.behaviors).toHaveLength(3);

      // Behavior 1: vs Evasión
      expect(contract.behaviors[0].requiresRoll).toBe(true);
      expect(contract.behaviors[0].opposition?.targetDefense).toBe('EVA');
      expect(contract.behaviors[0].opposition?.label).toBe('Evasión');

      // Behavior 2: vs Coraje
      expect(contract.behaviors[1].requiresRoll).toBe(true);
      expect(contract.behaviors[1].opposition?.targetDefense).toBe('COR');
      expect(contract.behaviors[1].opposition?.label).toBe('Coraje');

      // Behavior 3: Support / self
      expect(contract.behaviors[2].requiresRoll).toBe(false);
      expect(contract.behaviors[2].opposition).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. RUNTIME EXECUTION: TARGET DEFENSE VALUE RESOLUTION AND OUTCOMES
  // =========================================================================
  describe('5. Runtime Execution with Real Target Defenses', () => {
    const makeCombatWorld = (): RuleWorld => ({
      attacker: {
        resources: { SA: { current: 30, max: 30 }, ES: { current: 20, max: 20 } },
        barrier: 0,
        attributes: { FUE: 3, INT: 4, VEL: 2, VOL: 2 },
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      defender: {
        resources: { SA: { current: 30, max: 30 }, ES: { current: 20, max: 20 } },
        barrier: 0,
        attributes: { FUE: 2, VEL: 3, VOL: 4 }, // Base EVA = 10 + 3 = 13, Base COR = 10 + 4 = 14
        modifiers: [],
        statuses: [],
        inventory: {},
      },
    });

    it('resolves defense values: Evasión (10 + VEL) and Coraje (10 + VOL)', () => {
      const world = makeCombatWorld();
      const defender = world.defender;

      const eva = resolveTargetDefenseValue(defender, undefined, 'EVA');
      const cor = resolveTargetDefenseValue(defender, undefined, 'COR');

      expect(eva).toBe(13); // 10 + 3 VEL
      expect(cor).toBe(14); // 10 + 4 VOL
    });

    it('includes modifiers in target defense calculation', () => {
      const world = makeCombatWorld();
      world.defender.modifiers.push({
        sourceId: 'item_boots',
        statId: 'EVA',
        amount: 2,
      });

      const eva = resolveTargetDefenseValue(world.defender, undefined, 'EVA');
      expect(eva).toBe(15); // 10 + 3 + 2 = 15
    });

    it('Control technique: roll >= target defense hits and applies status', () => {
      const world = makeCombatWorld();
      const encounter = createEncounterRuntimeState(1);

      const behavior = makeBehavior({
        id: 'bh_control_stun',
        target: { type: 'character' },
        resolution: {
          type: 'roll',
          attackType: 'physical',
          targetDefense: 'EVA',
        } as any,
        effects: [
          {
            id: 'eff_stun',
            type: 'status_apply',
            statusElementId: 'core.status.stunned',
            turns: 1,
          },
        ],
      });

      // Target EVA is 13. Attacker rolls 14 -> Success
      const result = executeMechanicalBehavior({
        behavior,
        sourceEntityId: 'attacker',
        targetEntityId: 'defender',
        world,
        encounter,
        rollResult: 14,
      });

      expect(result.success).toBe(true);
      expect(result.resolution?.outcome).toBe('success');
      expect(result.newWorld.defender.statuses.some((s) => s.statusElementId === 'core.status.stunned')).toBe(true);
    });

    it('Control technique: roll < target defense fails and does NOT apply status', () => {
      const world = makeCombatWorld();
      const encounter = createEncounterRuntimeState(1);

      const behavior = makeBehavior({
        id: 'bh_control_stun',
        target: { type: 'character' },
        resolution: {
          type: 'roll',
          attackType: 'physical',
          targetDefense: 'EVA',
        } as any,
        effects: [
          {
            id: 'eff_stun',
            type: 'status_apply',
            statusElementId: 'core.status.stunned',
            turns: 1,
          },
        ],
      });

      // Target EVA is 13. Attacker rolls 10 -> Failure
      const result = executeMechanicalBehavior({
        behavior,
        sourceEntityId: 'attacker',
        targetEntityId: 'defender',
        world,
        encounter,
        rollResult: 10,
      });

      expect(result.success).toBe(true); // Execution completed
      expect(result.resolution?.outcome).toBe('failure');
      expect(result.newWorld.defender.statuses).toHaveLength(0); // Resisted!
    });

    it('Mental Control technique: opposes Coraje (14). Roll 12 fails, roll 15 succeeds', () => {
      const world = makeCombatWorld();
      const encounter = createEncounterRuntimeState(1);

      const mentalBehavior = makeBehavior({
        id: 'bh_mental_curse',
        target: { type: 'character' },
        resolution: {
          type: 'roll',
          attackType: 'mental',
          targetDefense: 'COR',
        } as any,
        effects: [
          {
            id: 'eff_locura',
            type: 'status_apply',
            statusElementId: 'core.status.locura',
            turns: 2,
          },
        ],
      });

      // Roll 12 < 14 Coraje -> Failure
      const resFail = executeMechanicalBehavior({
        behavior: mentalBehavior,
        sourceEntityId: 'attacker',
        targetEntityId: 'defender',
        world,
        encounter,
        rollResult: 12,
      });
      expect(resFail.resolution?.outcome).toBe('failure');
      expect(resFail.newWorld.defender.statuses).toHaveLength(0);

      // Roll 15 >= 14 Coraje -> Success
      const resSuccess = executeMechanicalBehavior({
        behavior: mentalBehavior,
        sourceEntityId: 'attacker',
        targetEntityId: 'defender',
        world,
        encounter,
        rollResult: 15,
      });
      expect(resSuccess.resolution?.outcome).toBe('success');
      expect(resSuccess.newWorld.defender.statuses.some((s) => s.statusElementId === 'core.status.locura')).toBe(true);
    });

    it('Multi-target execution: each target defends with their own defense', () => {
      const world: RuleWorld = {
        attacker: {
          resources: { SA: { current: 30, max: 30 }, ES: { current: 20, max: 20 } },
          barrier: 0,
          attributes: { FUE: 3 },
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        targetAgile: {
          resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 10 } },
          barrier: 0,
          attributes: { VEL: 5 }, // EVA = 15
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        targetSlow: {
          resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 10 } },
          barrier: 0,
          attributes: { VEL: 1 }, // EVA = 11
          modifiers: [],
          statuses: [],
          inventory: {},
        },
      };

      const encounter = createEncounterRuntimeState(1);
      const multiBehavior = makeBehavior({
        id: 'bh_multi_flash',
        target: { type: 'character' },
        resolution: {
          type: 'roll',
          attackType: 'physical',
          targetDefense: 'EVA',
        } as any,
        effects: [
          {
            id: 'eff_dmg',
            type: 'damage',
            dice: '2D6',
          },
        ],
      });

      // RollResult 13: hits targetSlow (EVA 11), misses targetAgile (EVA 15)
      const multiRes = executeMultiTargetBehavior({
        behavior: multiBehavior,
        sourceEntityId: 'attacker',
        targetEntityIds: ['targetSlow', 'targetAgile'],
        world,
        encounter,
        rollResult: 13,
      });

      expect(multiRes.success).toBe(true);
      // targetSlow was hit and lost Health
      expect(multiRes.newWorld.targetSlow.resources.SA.current).toBeLessThan(20);
      // targetAgile evaded and retained full Health
      expect(multiRes.newWorld.targetAgile.resources.SA.current).toBe(20);
    });
  });

  // =========================================================================
  // 6. BACKWARDS COMPATIBILITY AND EXPLICIT OVERRIDES
  // =========================================================================
  describe('6. Compatibility with Stored Techniques and Explicit Overrides', () => {
    it('preserves explicit user overrides marked with isExplicit', () => {
      const behavior = makeBehavior({
        id: 'bh_custom_rd',
        resolution: {
          type: 'rd',
          difficulty: 18,
          isExplicit: true,
        } as any,
        effects: [{ id: 'eff_1', type: 'damage', dice: '1D6' }],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'control' });
      expect(res.type).toBe('rd');
      expect(res.difficulty).toBe(18);
      expect(res.isDerived).toBe(false);
    });

    it('preserves explicit non-standard roll attributes', () => {
      const behavior = makeBehavior({
        id: 'bh_custom_roll',
        resolution: {
          type: 'roll',
          attribute: 'VOL',
          skill: 'Hipnosis',
          attackType: 'mental',
          isExplicit: true,
        } as any,
        effects: [
          { id: 'eff_hypno', type: 'status_apply', statusElementId: 'core.status.dormido', turns: 2 },
        ],
      });

      const res = deriveEffectiveBehaviorResolution(behavior, { classification: 'control' });
      expect(res.type).toBe('roll');
      expect(res.attribute).toBe('VOL');
      expect(res.skill).toBe('Hipnosis');
      expect(res.targetDefense).toBe('COR');
      expect(res.oppositionLabel).toBe('Coraje');
      expect(res.isDerived).toBe(false);
    });
  });
});

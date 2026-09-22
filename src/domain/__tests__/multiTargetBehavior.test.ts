import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeMultiTargetBehavior,
  executeMechanicalBehavior,
  RuleWorld,
  EncounterRuntimeState,
  createEncounterRuntimeState,
  createParticipantRuntimeState,
  resolveEntityRelationship,
} from '../mechanicalRuntime';
import { SYSTEM_TRAITS } from '../systemTraits';
import { SYSTEM_WEAKNESSES } from '../systemWeaknesses';
import { MechanicalBehavior } from '../mechanicalBehavior';

function getTraitBehaviors(traitId: string): MechanicalBehavior[] {
  const t = SYSTEM_TRAITS.find((item) => item.id === traitId);
  if (!t) throw new Error(`Trait ${traitId} not found in SYSTEM_TRAITS`);
  return t.mechanicalBehaviors;
}

function getWeaknessBehaviors(weaknessId: string): MechanicalBehavior[] {
  const w = SYSTEM_WEAKNESSES.find((item) => item.id === weaknessId);
  if (!w) throw new Error(`Weakness ${weaknessId} not found in SYSTEM_WEAKNESSES`);
  return w.mechanicalBehaviors;
}

function createTestBehavior(partial: Partial<MechanicalBehavior> & { id: string; name: string }): MechanicalBehavior {
  return {
    mode: "active",
    conditions: [],
    conditionLogic: "all",
    limitations: [],
    effects: [],
    ...partial,
  };
}

describe('Task 21 — Multi-Target Behavior Execution and Líder nato', () => {
  let world: RuleWorld;
  let encounter: EncounterRuntimeState;
  let liderNatoBehavior: MechanicalBehavior;
  let malaCaraBehaviors: Array<{ elementId: string; behavior: MechanicalBehavior }>;

  beforeEach(() => {
    world = {
      hero: {
        id: 'hero',
        name: 'Hero (Leader)',
        level: 1,
        rank: 'Novato',
        faction: 'heroes',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 15, max: 20 },
          ES: { current: 5, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      allyA: {
        id: 'allyA',
        name: 'Ally A',
        level: 1,
        rank: 'Novato',
        faction: 'heroes',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 10, max: 20 },
          ES: { current: 4, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      allyB: {
        id: 'allyB',
        name: 'Ally B',
        level: 1,
        rank: 'Novato',
        faction: 'heroes',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 10, max: 20 },
          ES: { current: 4, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      allyC: {
        id: 'allyC',
        name: 'Ally C',
        level: 1,
        rank: 'Novato',
        faction: 'heroes',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 10, max: 20 },
          ES: { current: 4, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      allyD: {
        id: 'allyD',
        name: 'Ally D',
        level: 1,
        rank: 'Novato',
        faction: 'heroes',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 10, max: 20 },
          ES: { current: 4, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      enemy: {
        id: 'enemy',
        name: 'Villain',
        level: 1,
        rank: 'Novato',
        faction: 'villains',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 20, max: 20 },
          ES: { current: 10, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
    };

    encounter = createEncounterRuntimeState(1);
    encounter.participants.hero = createParticipantRuntimeState('hero');
    encounter.participants.allyA = createParticipantRuntimeState('allyA');
    encounter.participants.allyB = createParticipantRuntimeState('allyB');
    encounter.participants.allyC = createParticipantRuntimeState('allyC');
    encounter.participants.allyD = createParticipantRuntimeState('allyD');
    encounter.participants.enemy = createParticipantRuntimeState('enemy');

    const lnBehaviors = getTraitBehaviors('core.trait.natural-leader');
    liderNatoBehavior = lnBehaviors[0];

    const mcBehaviors = getWeaknessBehaviors('weakness_mala_cara');
    malaCaraBehaviors = mcBehaviors.map((b) => ({ elementId: 'weakness_mala_cara', behavior: b }));
  });

  // Scenario A: One ally
  it('Scenario A: Líder nato applies +2 ES to 1 ally and consumes 1 combat usage', () => {
    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA'],
      world,
      encounter,
      signals: ['speech'],
    });

    expect(res.success).toBe(true);
    expect(res.usageConsumed).toBe(true);
    expect(res.normalizedTargetIds).toEqual(['allyA']);
    expect(res.newWorld.allyA.resources.ES.current).toBe(6); // 4 + 2
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBe(1);
  });

  // Scenario B: Three allies
  it('Scenario B: Líder nato applies +2 ES to 3 allies and consumes exactly 1 usage', () => {
    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB', 'allyC'],
      world,
      encounter,
      signals: ['speech'],
    });

    expect(res.success).toBe(true);
    expect(res.usageConsumed).toBe(true);
    expect(res.normalizedTargetIds).toEqual(['allyA', 'allyB', 'allyC']);
    expect(res.newWorld.allyA.resources.ES.current).toBe(6);
    expect(res.newWorld.allyB.resources.ES.current).toBe(6);
    expect(res.newWorld.allyC.resources.ES.current).toBe(6);
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBe(1);
  });

  // Scenario C: Duplicate IDs
  it('Scenario C: Duplicate IDs are normalized, receiving only +2 ES once and consuming 1 usage', () => {
    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyA', 'allyB'],
      world,
      encounter,
      signals: ['speech'],
    });

    expect(res.success).toBe(true);
    expect(res.usageConsumed).toBe(true);
    expect(res.normalizedTargetIds).toEqual(['allyA', 'allyB']);
    expect(res.newWorld.allyA.resources.ES.current).toBe(6); // exactly +2, not +4
    expect(res.newWorld.allyB.resources.ES.current).toBe(6);
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBe(1);
  });

  // Scenario D: More than three targets
  it('Scenario D: More than 3 targets rejects action, applies no healing, and usage remains 0', () => {
    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB', 'allyC', 'allyD'],
      world,
      encounter,
      signals: ['speech'],
    });

    expect(res.success).toBe(false);
    expect(res.usageConsumed).toBe(false);
    expect(res.reasons?.[0]).toContain('exceeds maximum allowed of 3');
    expect(res.newWorld.allyA.resources.ES.current).toBe(4);
    expect(res.newWorld.allyB.resources.ES.current).toBe(4);
    expect(res.newWorld.allyC.resources.ES.current).toBe(4);
    expect(res.newWorld.allyD.resources.ES.current).toBe(4);
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBeUndefined();
  });

  // Scenario E: Self included
  it('Scenario E: Self included in ally targeting rejects action and applies nothing', () => {
    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'hero'],
      world,
      encounter,
      signals: ['speech'],
    });

    expect(res.success).toBe(false);
    expect(res.usageConsumed).toBe(false);
    expect(res.reasons?.[0]).toContain('Cannot target self when target type is ally');
    expect(res.newWorld.allyA.resources.ES.current).toBe(4);
    expect(res.newWorld.hero.resources.ES.current).toBe(5);
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBeUndefined();
  });

  // Scenario F: Enemy included
  it('Scenario F: Enemy included in ally targeting rejects action atomically', () => {
    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'enemy'],
      world,
      encounter,
      signals: ['speech'],
    });

    expect(res.success).toBe(false);
    expect(res.usageConsumed).toBe(false);
    expect(res.reasons?.[0]).toContain('is not an ally');
    expect(res.newWorld.allyA.resources.ES.current).toBe(4);
    expect(res.newWorld.enemy.resources.ES.current).toBe(10);
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBeUndefined();
  });

  // Scenario G: Missing speech signal
  it('Scenario G: Missing speech signal fails conditions, applies no healing, and consumes no usage', () => {
    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB'],
      world,
      encounter,
      signals: [], // No 'speech' signal
    });

    expect(res.success).toBe(false);
    expect(res.usageConsumed).toBe(false);
    expect(res.reasons?.[0]).toBe('Conditions not met');
    expect(res.newWorld.allyA.resources.ES.current).toBe(4);
    expect(res.newWorld.allyB.resources.ES.current).toBe(4);
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBeUndefined();
  });

  // Scenario H: Second use same combat
  it('Scenario H: Second activation in the same encounter is rejected by usage_limit', () => {
    const firstRes = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA'],
      world,
      encounter,
      signals: ['speech'],
    });

    expect(firstRes.success).toBe(true);
    expect(firstRes.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBe(1);

    const secondRes = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyB'],
      world: firstRes.newWorld,
      encounter: firstRes.newEncounter,
      signals: ['speech'],
    });

    expect(secondRes.success).toBe(false);
    expect(secondRes.usageConsumed).toBe(false);
    expect(secondRes.reasons?.[0]).toBe('Limitations violated');
    expect(secondRes.newWorld.allyB.resources.ES.current).toBe(4);
    expect(secondRes.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBe(1);
  });

  // Scenario I: New encounter restores availability
  it('Scenario I: Fresh EncounterRuntimeState restores ability naturally without DB persistence', () => {
    const firstRes = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA'],
      world,
      encounter,
      signals: ['speech'],
    });
    expect(firstRes.success).toBe(true);

    const freshEncounter = createEncounterRuntimeState(1);
    freshEncounter.participants.hero = createParticipantRuntimeState('hero');
    freshEncounter.participants.allyB = createParticipantRuntimeState('allyB');

    const secondEncounterRes = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyB'],
      world: firstRes.newWorld,
      encounter: freshEncounter,
      signals: ['speech'],
    });

    expect(secondEncounterRes.success).toBe(true);
    expect(secondEncounterRes.newWorld.allyB.resources.ES.current).toBe(6);
    expect(secondEncounterRes.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBe(1);
  });

  // Scenario J: Mala Cara partial interception
  it('Scenario J: Target with Mala Cara failing RD 12 is blocked, while other allies heal and usage is consumed once', () => {
    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB', 'allyC'],
      world,
      encounter,
      signals: ['speech'],
      rollResult: 8, // fails RD 12 for Mala Cara
      targetOwnedBehaviors: {
        allyB: malaCaraBehaviors, // Only Ally B has Mala Cara
      },
    });

    expect(res.success).toBe(true);
    expect(res.usageConsumed).toBe(true);
    expect(res.newWorld.allyA.resources.ES.current).toBe(6); // Healed +2
    expect(res.newWorld.allyB.resources.ES.current).toBe(4); // Blocked by Mala Cara (+0)
    expect(res.newWorld.allyC.resources.ES.current).toBe(6); // Healed +2
    expect(res.targetResults.allyB.blockedEffects).toContain('healing');
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBe(1);
  });

  // Scenario K: Target at max ES
  it('Scenario K: Ally already at max ES receives +0 actual credited recovery without invalidating action', () => {
    world.allyA.resources.ES.current = 10; // Already max (10/10)

    const res = executeMultiTargetBehavior({
      behavior: liderNatoBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB'],
      world,
      encounter,
      signals: ['speech'],
    });

    expect(res.success).toBe(true);
    expect(res.usageConsumed).toBe(true);
    expect(res.newWorld.allyA.resources.ES.current).toBe(10); // Capped at max
    expect(res.targetResults.allyA.actualAmountCredited).toBe(0);
    expect(res.newWorld.allyB.resources.ES.current).toBe(6); // 4 + 2
    expect(res.targetResults.allyB.actualAmountCredited).toBe(2);
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:natural-leader.speech']).toBe(1);
  });

  // Scenario L: Generic behavior (no Trait ID hardcoding)
  it('Scenario L: Generic behavior with up_to 2 and healing ES +1 executes correctly', () => {
    const genericBehavior = createTestBehavior({
      id: 'custom_support_spell',
      name: 'Custom Support Spell',
      mode: 'active',
      target: {
        type: 'ally',
        quantity: {
          mode: 'up_to',
          count: 2,
        },
      },
      effects: [
        {
          id: 'custom_heal_es',
          type: 'healing',
          resourceId: 'ES',
          amount: 1,
        },
      ],
      limitations: [
        {
          id: 'custom_limitation',
          type: 'usage_limit',
          period: 'combat',
          max: 1,
        },
      ],
    });

    const res = executeMultiTargetBehavior({
      behavior: genericBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB'],
      world,
      encounter,
    });

    expect(res.success).toBe(true);
    expect(res.usageConsumed).toBe(true);
    expect(res.newWorld.allyA.resources.ES.current).toBe(5); // 4 + 1
    expect(res.newWorld.allyB.resources.ES.current).toBe(5); // 4 + 1
    expect(res.newEncounter.participants.hero.usageCounters['combat:current:custom_support_spell']).toBe(1);
  });

  // Scenario M: Exact quantity
  it('Scenario M: Exact quantity mode (count: 2) rejects 1 target, accepts 2, and rejects 3', () => {
    const exactBehavior = createTestBehavior({
      id: 'duo_link',
      name: 'Duo Link',
      mode: 'active',
      target: {
        type: 'ally',
        quantity: {
          mode: 'exact',
          count: 2,
        },
      },
      effects: [
        {
          id: 'duo_heal',
          type: 'healing',
          resourceId: 'ES',
          amount: 1,
        },
      ],
    });

    // 1 target -> rejected
    const res1 = executeMultiTargetBehavior({
      behavior: exactBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA'],
      world,
      encounter,
    });
    expect(res1.success).toBe(false);
    expect(res1.reasons?.[0]).toContain('does not match exact required count of 2');

    // 2 targets -> accepted
    const res2 = executeMultiTargetBehavior({
      behavior: exactBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB'],
      world,
      encounter,
    });
    expect(res2.success).toBe(true);
    expect(res2.newWorld.allyA.resources.ES.current).toBe(5);
    expect(res2.newWorld.allyB.resources.ES.current).toBe(5);

    // 3 targets -> rejected
    const res3 = executeMultiTargetBehavior({
      behavior: exactBehavior,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB', 'allyC'],
      world,
      encounter,
    });
    expect(res3.success).toBe(false);
    expect(res3.reasons?.[0]).toContain('does not match exact required count of 2');
  });

  // Scenario N: No recursive/multiple interception on same target
  it('Scenario N: Multi-effect support action executes interception once per target participant', () => {
    const multiEffectSupport = createTestBehavior({
      id: 'blessing_of_vitality',
      name: 'Blessing of Vitality',
      mode: 'active',
      target: {
        type: 'ally',
        quantity: { mode: 'up_to', count: 2 },
      },
      effects: [
        {
          id: 'eff_heal',
          type: 'healing',
          resourceId: 'SA',
          amount: 3,
        },
        {
          id: 'eff_barrier',
          type: 'barrier',
          amount: 3,
        },
      ],
    });

    const res = executeMultiTargetBehavior({
      behavior: multiEffectSupport,
      sourceEntityId: 'hero',
      targetEntityIds: ['allyA', 'allyB'],
      world,
      encounter,
      attackTags: ['support'],
      rollResult: 8, // fails RD 12
      targetOwnedBehaviors: {
        allyB: malaCaraBehaviors,
      },
    });

    expect(res.success).toBe(true);
    // Ally A (no Mala Cara) receives heal + barrier
    expect(res.newWorld.allyA.resources.SA.current).toBe(13); // 10 + 3
    expect(res.newWorld.allyA.barrier).toBe(3);

    // Ally B (Mala Cara fails once) blocks both heal and barrier under the same action
    expect(res.newWorld.allyB.resources.SA.current).toBe(10);
    expect(res.newWorld.allyB.barrier).toBe(0);

    // Verify executedBehaviorEvents has the action recorded for allyB
    const bEvents = res.newEncounter.participants.allyB.executedBehaviorEvents;
    const distrustEvents = bEvents.filter((e) => e.startsWith('mb_mala_cara_support_check:'));
    expect(distrustEvents.length).toBe(2); // 1 for execution, 1 for :blocked result key
  });

  // Extra verification: resolveEntityRelationship helper
  it('Verifies resolveEntityRelationship handles self, ally, enemy, and unknown', () => {
    expect(resolveEntityRelationship('hero', 'hero', world)).toBe('self');
    expect(resolveEntityRelationship('hero', 'allyA', world)).toBe('ally');
    expect(resolveEntityRelationship('hero', 'enemy', world)).toBe('enemy');
    expect(resolveEntityRelationship('hero', 'nonexistent', world)).toBe('unknown');

    const worldWithoutFactions: RuleWorld = {
      p1: { ...world.hero, faction: undefined },
      p2: { ...world.allyA, faction: undefined },
    };
    expect(resolveEntityRelationship('p1', 'p2', worldWithoutFactions)).toBe('unknown');
  });
});

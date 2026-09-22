import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeMechanicalBehavior,
  ExecuteBehaviorOptions,
  RuleWorld,
  EncounterRuntimeState,
  createParticipantRuntimeState,
} from '../mechanicalRuntime';
import { SYSTEM_WEAKNESSES } from '../systemWeaknesses';
import { MechanicalBehavior } from '../mechanicalBehavior';

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

describe('Task 17 — Generic Incoming Effect Interception & Mala Cara', () => {
  let world: RuleWorld;
  let encounter: EncounterRuntimeState;

  beforeEach(() => {
    world = {
      hero: {
        id: 'hero',
        name: 'Hero',
        level: 1,
        rank: 'Novato',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 10, max: 20 },
          ES: { current: 5, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
        faction: 'heroes',
      },
      ally: {
        id: 'ally',
        name: 'Ally',
        level: 1,
        rank: 'Novato',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 20, max: 20 },
          ES: { current: 10, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
        faction: 'heroes',
      },
      enemy: {
        id: 'enemy',
        name: 'Villain',
        level: 1,
        rank: 'Novato',
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 20, max: 20 },
          ES: { current: 10, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
        faction: 'villains',
      },
    };

    encounter = {
      turn: 1,
      participants: {
        hero: createParticipantRuntimeState('hero'),
        ally: createParticipantRuntimeState('ally'),
        enemy: createParticipantRuntimeState('enemy'),
      },
      eventLog: [],
      traceLog: [],
    };
  });

  const malaCaraBehaviors = getWeaknessBehaviors('weakness_mala_cara').map((b) => ({
    elementId: 'weakness_mala_cara',
    behavior: b,
  }));

  // Scenario A: Allied Healing Interception - RD check failure blocks healing
  it('Scenario A: Allied healing is blocked when target with Mala Cara fails the RD 12 check', () => {
    const healBehavior = createTestBehavior({
      id: 'allied_heal_action',
      name: 'Allied Heal',
      mode: 'active',
      effects: [
        {
          id: 'eff_heal_1',
          type: 'healing',
          amount: 6,
          resourceId: 'SA',
          target: { type: 'character' },
        },
      ],
    });

    const res = executeMechanicalBehavior({
      behavior: healBehavior,
      sourceEntityId: 'ally',
      targetEntityId: 'hero',
      world,
      encounter,
      attackTags: ['support'],
      rollResult: 8, // < 12 => RD check fails
      targetOwnedBehaviors: malaCaraBehaviors,
    });

    expect(res.success).toBe(true);
    // Hero HP must remain 10 (not healed to 16)
    expect(res.newWorld.hero.resources.SA.current).toBe(10);
    // Trace log contains blocked effect
    expect(res.newEncounter.traceLog.some((t) => t.appliedEffects.includes('blocked:healing'))).toBe(true);
  });

  // Scenario B: Allied Healing Interception - RD check success allows healing
  it('Scenario B: Allied healing is applied when target with Mala Cara passes the RD 12 check', () => {
    const healBehavior = createTestBehavior({
      id: 'allied_heal_action',
      name: 'Allied Heal',
      mode: 'active',
      effects: [
        {
          id: 'eff_heal_1',
          type: 'healing',
          amount: 6,
          resourceId: 'SA',
          target: { type: 'character' },
        },
      ],
    });

    const res = executeMechanicalBehavior({
      behavior: healBehavior,
      sourceEntityId: 'ally',
      targetEntityId: 'hero',
      world,
      encounter,
      attackTags: ['support'],
      rollResult: 14, // >= 12 => RD check passes
      targetOwnedBehaviors: malaCaraBehaviors,
    });

    expect(res.success).toBe(true);
    // Hero HP increases to 16
    expect(res.newWorld.hero.resources.SA.current).toBe(16);
    expect(res.newEncounter.traceLog.some((t) => t.appliedEffects.includes('blocked:healing'))).toBe(false);
  });

  // Scenario C: Allied Barrier Interception - RD check failure blocks barrier
  it('Scenario C: Allied barrier is blocked when target with Mala Cara fails the RD 12 check', () => {
    const barrierBehavior = createTestBehavior({
      id: 'allied_barrier_action',
      name: 'Allied Barrier',
      mode: 'active',
      effects: [
        {
          id: 'eff_barrier_1',
          type: 'barrier',
          amount: 8,
          target: { type: 'character' },
        },
      ],
    });

    const res = executeMechanicalBehavior({
      behavior: barrierBehavior,
      sourceEntityId: 'ally',
      targetEntityId: 'hero',
      world,
      encounter,
      attackTags: ['support'],
      rollResult: 6, // fails
      targetOwnedBehaviors: malaCaraBehaviors,
    });

    expect(res.success).toBe(true);
    // Barrier remains 0
    expect(res.newWorld.hero.barrier).toBe(0);
    expect(res.newEncounter.traceLog.some((t) => t.appliedEffects.includes('blocked:barrier'))).toBe(true);
  });

  // Scenario D: Allied Status Buff Interception - RD check failure blocks beneficial status
  it('Scenario D: Allied beneficial status is blocked when target with Mala Cara fails RD 12 check', () => {
    const buffBehavior = createTestBehavior({
      id: 'allied_buff_action',
      name: 'Allied Buff',
      mode: 'active',
      effects: [
        {
          id: 'eff_buff_1',
          type: 'status_apply',
          statusElementId: 'core.status.strengthened',
          turns: 2,
          target: { type: 'character' },
        },
      ],
    });

    const res = executeMechanicalBehavior({
      behavior: buffBehavior,
      sourceEntityId: 'ally',
      targetEntityId: 'hero',
      world,
      encounter,
      attackTags: ['support'],
      rollResult: 9, // fails
      targetOwnedBehaviors: malaCaraBehaviors,
    });

    expect(res.success).toBe(true);
    // Hero status list remains empty
    expect(res.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.strengthened')).toBe(false);
    expect(res.newEncounter.traceLog.some((t) => t.appliedEffects.includes('blocked:status_apply'))).toBe(true);
  });

  // Scenario E: Enemy Attack with Support Tag or Harmful Status - NOT intercepted by Mala Cara
  it('Scenario E: Enemy attack is never blocked by allied support interception', () => {
    const attackBehavior = createTestBehavior({
      id: 'enemy_attack',
      name: 'Enemy Strike',
      mode: 'active',
      effects: [
        {
          id: 'eff_dmg_1',
          type: 'damage',
          dice: '5',
          target: { type: 'character' },
        },
      ],
    });

    const res = executeMechanicalBehavior({
      behavior: attackBehavior,
      sourceEntityId: 'enemy',
      targetEntityId: 'hero',
      world,
      encounter,
      attackTags: ['attack'],
      rollResult: 5,
      targetOwnedBehaviors: malaCaraBehaviors,
    });

    expect(res.success).toBe(true);
    // Hero takes damage
    expect(res.newWorld.hero.resources.SA.current).toBe(5); // 10 - 5
  });

  // Scenario F: Self Healing / Buffs - NOT intercepted by Mala Cara
  it('Scenario F: Self healing / self buffs are never intercepted by Mala Cara', () => {
    const selfHealBehavior = createTestBehavior({
      id: 'self_heal',
      name: 'Second Wind',
      mode: 'active',
      effects: [
        {
          id: 'eff_self_heal',
          type: 'healing',
          amount: 4,
          resourceId: 'SA',
          target: { type: 'self' },
        },
      ],
    });

    const res = executeMechanicalBehavior({
      behavior: selfHealBehavior,
      sourceEntityId: 'hero',
      targetEntityId: 'hero',
      world,
      encounter,
      attackTags: ['support'],
      rollResult: 5, // low roll, but self-targeted!
      targetOwnedBehaviors: malaCaraBehaviors,
    });

    expect(res.success).toBe(true);
    // Hero self-heals without interception
    expect(res.newWorld.hero.resources.SA.current).toBe(14); // 10 + 4
  });

  // Scenario G: Multi-Effect Support Action - All effects blocked together on single failure
  it('Scenario G: Multi-effect support action (healing + barrier) blocks both effects on failure', () => {
    const comboSupportBehavior = createTestBehavior({
      id: 'allied_combo_support',
      name: 'Holy Blessing',
      mode: 'active',
      effects: [
        {
          id: 'eff_combo_heal',
          type: 'healing',
          amount: 5,
          resourceId: 'SA',
          target: { type: 'character' },
        },
        {
          id: 'eff_combo_barrier',
          type: 'barrier',
          amount: 5,
          target: { type: 'character' },
        },
      ],
    });

    const res = executeMechanicalBehavior({
      behavior: comboSupportBehavior,
      sourceEntityId: 'ally',
      targetEntityId: 'hero',
      world,
      encounter,
      attackTags: ['support'],
      rollResult: 8, // fails RD 12
      targetOwnedBehaviors: malaCaraBehaviors,
    });

    expect(res.success).toBe(true);
    expect(res.newWorld.hero.resources.SA.current).toBe(10);
    expect(res.newWorld.hero.barrier).toBe(0);
    expect(res.newEncounter.traceLog.some((t) => t.appliedEffects.includes('blocked:healing'))).toBe(true);
    expect(res.newEncounter.traceLog.some((t) => t.appliedEffects.includes('blocked:barrier'))).toBe(true);
  });

  // Scenario H: Single RD Roll per Support Action
  it('Scenario H: Only evaluates one RD check per support action even with multiple effects', () => {
    const comboSupportBehavior = createTestBehavior({
      id: 'allied_multi_effect',
      name: 'Restoration',
      mode: 'active',
      effects: [
        {
          id: 'eff_1',
          type: 'healing',
          amount: 3,
          resourceId: 'SA',
          target: { type: 'character' },
        },
        {
          id: 'eff_2',
          type: 'barrier',
          amount: 3,
          target: { type: 'character' },
        },
      ],
    });

    const res = executeMechanicalBehavior({
      behavior: comboSupportBehavior,
      sourceEntityId: 'ally',
      targetEntityId: 'hero',
      world,
      encounter,
      attackTags: ['support'],
      rollResult: 7,
      targetOwnedBehaviors: malaCaraBehaviors,
    });

    const heroParticipant = res.newEncounter.participants.hero;
    // Check that executedBehaviorEvents recorded the check exactly once (not including :blocked tag)
    const checks = heroParticipant.executedBehaviorEvents.filter(
      (k) => k.startsWith('mb_mala_cara_support_check:') && !k.endsWith(':blocked')
    );
    expect(checks.length).toBe(1);
    expect(heroParticipant.executedBehaviorEvents.includes('mb_mala_cara_support_check:action_ally_turn_1:blocked')).toBe(true);
  });

  // Scenario I: Generic Custom Interceptor Callback
  it('Scenario I: Generic custom interceptIncomingEffect callback can block or allow arbitrarily', () => {
    const healBehavior = createTestBehavior({
      id: 'custom_heal',
      name: 'Custom Heal',
      mode: 'active',
      effects: [
        {
          id: 'eff_heal_custom',
          type: 'healing',
          amount: 5,
          resourceId: 'SA',
          target: { type: 'character' },
        },
      ],
    });

    const resBlocked = executeMechanicalBehavior({
      behavior: healBehavior,
      sourceEntityId: 'ally',
      targetEntityId: 'hero',
      world,
      encounter,
      interceptIncomingEffect: (ctx) => {
        if (ctx.relationship === 'ally' && ctx.isSupport) {
          return { blocked: true, blockedReason: 'Custom anti-magic aura' };
        }
        return { blocked: false };
      },
    });

    expect(resBlocked.newWorld.hero.resources.SA.current).toBe(10);
    expect(resBlocked.newEncounter.traceLog.some((t) => t.appliedEffects.includes('blocked:healing'))).toBe(true);

    const resAllowed = executeMechanicalBehavior({
      behavior: healBehavior,
      sourceEntityId: 'ally',
      targetEntityId: 'hero',
      world,
      encounter,
      interceptIncomingEffect: () => ({ blocked: false }),
    });

    expect(resAllowed.newWorld.hero.resources.SA.current).toBe(15);
  });
});

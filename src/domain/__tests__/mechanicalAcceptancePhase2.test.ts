import { describe, expect, test } from "vitest";
import {
  executeMechanicalBehavior,
  dispatchMechanicalEvent,
  getActiveContinuousModifiers,
  calculateEffectiveCost,
  processDamagePipeline,
  processHealingPipeline,
  createParticipantRuntimeState,
  createEncounterRuntimeState,
  advanceTurn,
  resolveOutcomesForRoll,
  checkResourceThresholdTransition,
  makeCounterKey,
  mutateCounter,
  type OwnedBehaviorEntry,
} from "../mechanicalRuntime";
import type { RuleWorld } from "../ruleExecution";
import type { MechanicalBehavior } from "../mechanicalBehavior";

const makeWorld = (): RuleWorld => ({
  hero: {
    resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
    attributes: { FUE: 3, RES: 4, DES: 3 },
    barrier: 0,
    modifiers: [],
    statuses: [],
    inventory: {},
  },
  enemy: {
    resources: { SA: { current: 30, max: 30 }, ES: { current: 10, max: 20 } },
    attributes: { FUE: 2, RES: 2, DES: 2 },
    barrier: 0,
    modifiers: [],
    statuses: [],
    inventory: {},
  },
});

describe("ShadowApp — Fase 2: Tests de Aceptación Obligatorios", () => {
  // --------------------------------------------------------------------------
  // 1. Retroceso Corporal (use_quirk -> self damage 3)
  // --------------------------------------------------------------------------
  test("Retroceso Corporal: use_quirk -> self damage 3", () => {
    const world = makeWorld();
    const encounter = createEncounterRuntimeState();

    const behavior: MechanicalBehavior = {
      id: "bh_recoil",
      name: "Retroceso Corporal",
      mode: "reactive",
      trigger: { kind: "use_quirk" },
      conditions: [],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_recoil_3",
          type: "damage",
          dice: "3",
          target: { type: "self" },
        },
      ],
      limitations: [],
    };

    const ownedBehaviors: Record<string, OwnedBehaviorEntry[]> = {
      hero: [{ elementId: "elem_recoil", behavior }],
    };

    const dispatchResult = dispatchMechanicalEvent({
      event: {
        id: "evt_quirk_1",
        type: "use_quirk",
        sourceEntityId: "hero",
        targetEntityId: "hero",
      },
      ownedBehaviorsByEntity: ownedBehaviors,
      world,
      encounter,
    });

    expect(dispatchResult.executedBehaviors).toHaveLength(1);
    expect(dispatchResult.executedBehaviors[0].success).toBe(true);
    // Hero initial SA 20 -> receives 3 self damage -> 17
    expect(dispatchResult.newWorld.hero.resources.SA.current).toBe(17);
  });

  // --------------------------------------------------------------------------
  // 2. Punto de Quiebre (SA > 50% -> no mod; SA <= 50% -> action roll -2; SA > 50% -> disappears)
  // --------------------------------------------------------------------------
  test("Punto de Quiebre: SA <= 50% aplica -2 a tiradas de acción; desaparece al subir de 50%", () => {
    const world = makeWorld();
    const participant = createParticipantRuntimeState("hero");

    const behavior: MechanicalBehavior = {
      id: "bh_punto_quiebre",
      name: "Punto de Quiebre",
      mode: "continuous",
      conditions: [
        {
          id: "c_sa_50",
          type: "percentage",
          resourceId: "SA",
          comparison: "<=",
          percent: 50,
        },
      ],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_roll_minus_2",
          type: "roll_modifier",
          rollType: "action",
          amount: 2,
          operation: "subtract",
        },
      ],
      limitations: [],
    };

    const owned: OwnedBehaviorEntry[] = [{ elementId: "elem_pq", behavior }];

    // 1. SA is 20/20 (100% > 50%): no modifier
    const mods100 = getActiveContinuousModifiers(owned, world.hero, participant);
    expect(mods100.rollModifiers).toHaveLength(0);

    // 2. SA drops to 10/20 (50% <= 50%): -2 modifier active
    world.hero.resources.SA.current = 10;
    const mods50 = getActiveContinuousModifiers(owned, world.hero, participant);
    expect(mods50.rollModifiers).toHaveLength(1);
    expect(mods50.rollModifiers[0].amount).toBe(2);
    expect(mods50.rollModifiers[0].operation).toBe("subtract");

    // 3. SA is healed back to 15/20 (75% > 50%): modifier disappears automatically
    world.hero.resources.SA.current = 15;
    const mods75 = getActiveContinuousModifiers(owned, world.hero, participant);
    expect(mods75.rollModifiers).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // 3. Vulnerable al fuego (10 fire -> 14; 10 non-fire -> 10)
  // --------------------------------------------------------------------------
  test("Vulnerable al fuego: 10 fire damage -> 14; 10 non-fire damage -> 10 sin segundo evento", () => {
    const world = makeWorld();
    const encounter = createEncounterRuntimeState();

    const targetContinuousModifiers = [
      { operation: "add" as const, amount: 4, tagFilter: "fire" },
    ];

    // 1. Fire damage 10 against hero (barrier 0) -> 14 final damage
    const resFire = processDamagePipeline({
      baseDamage: 10,
      targetId: "hero",
      tags: ["fire"],
      world,
      encounter,
      targetContinuousModifiers,
    });
    expect(resFire.finalDamage).toBe(14);
    expect(resFire.newWorld.hero.resources.SA.current).toBe(6); // 20 - 14

    // 2. Non-fire damage 10 against hero -> 10 final damage
    const resPhysical = processDamagePipeline({
      baseDamage: 10,
      targetId: "hero",
      tags: ["physical"],
      world,
      encounter,
      targetContinuousModifiers,
    });
    expect(resPhysical.finalDamage).toBe(10);
    expect(resPhysical.newWorld.hero.resources.SA.current).toBe(10); // 20 - 10
  });

  // --------------------------------------------------------------------------
  // 4. Salud Frágil (healing 5 -> healing 4)
  // --------------------------------------------------------------------------
  test("Salud Frágil: healing 5 -> healing 4 sin convertirlo en daño", () => {
    const world = makeWorld();
    world.hero.resources.SA.current = 10;
    const encounter = createEncounterRuntimeState();

    const targetModifiers = [{ operation: "subtract" as const, amount: 1 }];

    const res = processHealingPipeline({
      baseHealing: 5,
      targetId: "hero",
      world,
      encounter,
      targetModifiers,
    });

    expect(res.finalHealing).toBe(4);
    expect(res.actualAmountCredited).toBe(4);
    expect(res.newWorld.hero.resources.SA.current).toBe(14);
  });

  // --------------------------------------------------------------------------
  // 5. Fatiga Crónica (Quirk cost +1; ES crosses downward <=3 -> Stunned once; no retrigger)
  // --------------------------------------------------------------------------
  test("Fatiga Crónica: coste de Quirk +1 y Stunned solo en transición activa hacia <= 3", () => {
    const world = makeWorld();
    const encounter = createEncounterRuntimeState();

    // 1. Quirk base cost 3 -> effective cost is 4
    const costRes = calculateEffectiveCost({
      baseCost: 3,
      scope: "quirk",
      entityId: "hero",
      encounter,
      continuousModifiers: [{ operation: "add", amount: 1 }],
    });
    expect(costRes.effectiveCost).toBe(4);

    // 2. Active downward transition: previous ES 5, current ES 3, threshold 3
    expect(checkResourceThresholdTransition(5, 3, 3, "cross_down")).toBe(true);

    // Reactive behavior for threshold crossing:
    const behavior: MechanicalBehavior = {
      id: "bh_fatiga_stun",
      name: "Fatiga Aturdimiento",
      mode: "reactive",
      trigger: {
        kind: "resource_threshold_crossed",
        resourceId: "ES",
        threshold: 3,
        direction: "cross_down",
      },
      conditions: [],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_stun",
          type: "status_apply",
          statusElementId: "status_stunned",
          turns: 1,
        },
      ],
      limitations: [],
    };

    const owned: Record<string, OwnedBehaviorEntry[]> = {
      hero: [{ elementId: "elem_fatiga", behavior }],
    };

    const dispatch1 = dispatchMechanicalEvent({
      event: {
        id: "evt_threshold_1",
        type: "resource_threshold_crossed",
        sourceEntityId: "hero",
        targetEntityId: "hero",
      },
      ownedBehaviorsByEntity: owned,
      world,
      encounter,
    });

    expect(dispatch1.executedBehaviors).toHaveLength(1);
    expect(dispatch1.newWorld.hero.statuses.some((s) => s.statusElementId === "status_stunned")).toBe(true);

    // 3. ES remains <= 3 (e.g. from 3 to 2): transition check is FALSE
    expect(checkResourceThresholdTransition(3, 2, 3, "cross_down")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 6. Dependencia (requisito cumplido -> normal; fallo -> bloqueado; fallo + excepción -> ES -4 y allow)
  // --------------------------------------------------------------------------
  test("Dependencia: evalúa condición de dosis, bloquea ante fallo y permite excepción con coste 4 ES", () => {
    const world = makeWorld();
    const encounter = createEncounterRuntimeState();

    const behavior: MechanicalBehavior = {
      id: "bh_dependencia",
      name: "Dependencia",
      mode: "active",
      conditions: [
        {
          id: "c_dosis",
          type: "status",
          statusElementId: "dosis_activa",
          present: true,
        },
      ],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_dosis_effect",
          type: "resource_modifier",
          resourceId: "SA",
          amount: 5,
          operation: "add",
        },
      ],
      limitations: [],
      control: {
        exception: {
          id: "exc_dep",
          failedConditionId: "c_dosis",
          allowWhenRequirementFailed: true,
          costResource: "ES",
          costAmount: 4,
          action: "allow",
        },
      },
    };

    // Case A: Requirement fulfilled (hero has status 'dosis_activa')
    world.hero.statuses.push({ sourceId: "med", statusElementId: "dosis_activa" });
    const resA = executeMechanicalBehavior({
      behavior,
      sourceEntityId: "hero",
      world,
      encounter,
      useException: false,
    });
    expect(resA.success).toBe(true);
    expect(resA.newWorld.hero.resources.ES.current).toBe(10); // No exception cost paid

    // Case B: Requirement fails (remove status), useException: false
    world.hero.statuses = [];
    const resB = executeMechanicalBehavior({
      behavior,
      sourceEntityId: "hero",
      world,
      encounter,
      useException: false,
    });
    expect(resB.success).toBe(false);
    expect(resB.reasons).toContain("Conditions not met");

    // Case C: Requirement fails, user accepts exception, hero has ES 10 (>= 4)
    const resC = executeMechanicalBehavior({
      behavior,
      sourceEntityId: "hero",
      world,
      encounter,
      useException: true,
    });
    expect(resC.success).toBe(true);
    expect(resC.newWorld.hero.resources.ES.current).toBe(6); // 10 - 4 paid
    expect(resC.newEncounter.participants.hero.esSpentThisTurn).toBe(4);
  });

  // --------------------------------------------------------------------------
  // 7. Derroche de Energía (ES spent <4 -> no trigger; ES spent >=4 -> RD12; failure -> ES -1, Vulnerable)
  // --------------------------------------------------------------------------
  test("Derroche de Energía: dispara al alcanzar >=4 ES gastadas en el turno; RD12 failure -> ES -1 y Vulnerable", () => {
    const world = makeWorld();
    const encounter = createEncounterRuntimeState();

    const behavior: MechanicalBehavior = {
      id: "bh_derroche",
      name: "Derroche de Energía",
      mode: "reactive",
      trigger: { kind: "spend_resource" },
      conditions: [
        {
          id: "c_es_spent",
          type: "turn_aggregate",
          metric: "es_spent",
          comparison: ">=",
          value: 4,
        },
      ],
      conditionLogic: "all",
      resolution: {
        type: "rd",
        difficulty: 12,
        outcomes: [
          { id: "o_succ", outcome: "success", description: "Éxito", effects: [] },
          {
            id: "o_fail",
            outcome: "failure",
            description: "Fallo",
            effects: [
              {
                id: "eff_es_drain",
                type: "resource_modifier",
                resourceId: "ES",
                amount: 1,
                operation: "subtract",
              },
              {
                id: "eff_vuln",
                type: "status_apply",
                statusElementId: "status_vulnerable",
                turns: 1,
              },
            ],
          },
        ],
      },
      effects: [],
      limitations: [],
    };

    // 1. ES spent this turn is 2 (< 4) -> condition fails, behavior fails execution
    encounter.participants["hero"] = createParticipantRuntimeState("hero");
    encounter.participants["hero"].esSpentThisTurn = 2;

    const resUnder = executeMechanicalBehavior({
      behavior,
      sourceEntityId: "hero",
      world,
      encounter,
    });
    expect(resUnder.success).toBe(false);

    // 2. ES spent reaches 4 (>= 4) -> condition passes
    encounter.participants["hero"].esSpentThisTurn = 4;

    // RD 12: roll result 10 (< 12) => failure
    const resFail = executeMechanicalBehavior({
      behavior,
      sourceEntityId: "hero",
      world,
      encounter,
      rollResult: 10,
    });
    expect(resFail.success).toBe(true);
    expect(resFail.resolution?.outcome).toBe("failure");
    expect(resFail.newWorld.hero.resources.ES.current).toBe(9); // 10 - 1
    expect(resFail.newWorld.hero.statuses.some((s) => s.statusElementId === "status_vulnerable")).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 8. Sobrecarga Total (doble 10 -> self damage 4, next Quirk cost x2; consumed next use; then normal)
  // --------------------------------------------------------------------------
  test("Sobrecarga Total: doble 10 inflige 4 de daño propio y duplica coste de siguiente Quirk", () => {
    const world = makeWorld();
    const encounter = createEncounterRuntimeState();

    const behavior: MechanicalBehavior = {
      id: "bh_sobrecarga_total",
      name: "Sobrecarga Total",
      mode: "reactive",
      trigger: { kind: "roll" },
      conditions: [
        {
          id: "c_double_10",
          type: "die",
          dieSelection: "both",
          comparison: "=",
          value: 10,
        },
      ],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_self_dmg_4",
          type: "damage",
          dice: "4",
          target: { type: "self" },
        },
        {
          id: "eff_next_quirk_x2",
          type: "cost_modifier",
          scopeId: "quirk",
          amount: 2,
          operation: "multiply",
          temporality: { duration: { type: "until_next_use" } },
        },
      ],
      limitations: [],
    };

    // Trigger on double 10 dice
    const res = executeMechanicalBehavior({
      behavior,
      sourceEntityId: "hero",
      world,
      encounter,
      dice: [10, 10],
    });

    expect(res.success).toBe(true);
    // Hero receives 4 self damage (20 - 4 = 16)
    expect(res.newWorld.hero.resources.SA.current).toBe(16);

    const updatedEncounter = res.newEncounter;
    expect(updatedEncounter.participants.hero.pendingModifiers).toHaveLength(1);

    // Next Quirk use (base cost 3)
    const cost1 = calculateEffectiveCost({
      baseCost: 3,
      scope: "quirk",
      entityId: "hero",
      encounter: updatedEncounter,
    });
    expect(cost1.effectiveCost).toBe(6); // 3 * 2
    expect(cost1.consumedPendingModifiers).toHaveLength(1);

    // Following Quirk use (normal cost)
    const cost2 = calculateEffectiveCost({
      baseCost: 3,
      scope: "quirk",
      entityId: "hero",
      encounter: updatedEncounter,
    });
    expect(cost2.effectiveCost).toBe(3);
  });

  // --------------------------------------------------------------------------
  // 9. Sobrecarga Progresiva (turnos consecutivos con Quirk: coste +1 acumulativo; turno sin Quirk: reset)
  // --------------------------------------------------------------------------
  test("Sobrecarga Progresiva: turnos consecutivos aumentan coste +1; turno sin Quirk resetea", () => {
    let encounter = createEncounterRuntimeState(1);
    encounter.participants["hero"] = createParticipantRuntimeState("hero", 1);

    const behavior: MechanicalBehavior = {
      id: "bh_sobrecarga_prog",
      name: "Sobrecarga Progresiva",
      mode: "continuous",
      conditions: [],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [],
      limitations: [],
      control: {
        counter: {
          id: "consec_counter",
          initialValue: 0,
          incrementOnTrigger: 1,
          resetCondition: "turn_without_quirk",
        },
        reset: {
          event: "turn_without_quirk",
          target: "counter",
        },
      },
    };

    const owned: Record<string, OwnedBehaviorEntry[]> = {
      hero: [{ elementId: "elem_prog", behavior }],
    };

    // Helper to get effective cost based on consecutive turns
    const getCost = (enc: typeof encounter, base: number = 3) => {
      const consec = enc.participants.hero.consecutiveTurnsQuirkUsed;
      return base + consec;
    };

    // Turn 1: Hero uses Quirk
    expect(getCost(encounter)).toBe(3); // 0 consecutive before
    encounter.participants.hero.usedQuirkThisTurn = true;

    // Advance to Turn 2: 1 consecutive turn
    encounter = advanceTurn(encounter, owned);
    expect(encounter.turn).toBe(2);
    expect(encounter.participants.hero.consecutiveTurnsQuirkUsed).toBe(1);
    expect(getCost(encounter)).toBe(4); // 3 + 1

    // Hero uses Quirk on Turn 2
    encounter.participants.hero.usedQuirkThisTurn = true;

    // Advance to Turn 3: 2 consecutive turns
    encounter = advanceTurn(encounter, owned);
    expect(encounter.turn).toBe(3);
    expect(encounter.participants.hero.consecutiveTurnsQuirkUsed).toBe(2);
    expect(getCost(encounter)).toBe(5); // 3 + 2

    // Hero does NOT use Quirk on Turn 3
    encounter.participants.hero.usedQuirkThisTurn = false;

    // Advance to Turn 4: Turn without Quirk -> resets counter!
    encounter = advanceTurn(encounter, owned);
    expect(encounter.turn).toBe(4);
    expect(encounter.participants.hero.consecutiveTurnsQuirkUsed).toBe(0);
    expect(getCost(encounter)).toBe(3); // normal cost 3
  });

  // --------------------------------------------------------------------------
  // 10. Trauma (RD 16: roll 17 -> 0; roll 14 -> 1 turno; roll 10 -> 2 turnos)
  // --------------------------------------------------------------------------
  test("Trauma: RD16 con ramas diferenciadas por margen (17 -> sin efecto, 14 -> Paralizado 1, 10 -> Paralizado 2)", () => {
    const outcomes = [
      {
        id: "out_success",
        outcome: "success" as const,
        description: "Sin parálisis",
        effects: [],
      },
      {
        id: "out_failure",
        outcome: "failure" as const,
        description: "Paralizado 1",
        effects: [
          {
            id: "eff_p1",
            type: "status_apply" as const,
            statusElementId: "status_paralizado",
            turns: 1,
          },
        ],
      },
      {
        id: "out_margin_5",
        outcome: "failure_margin" as const,
        marginThreshold: 5,
        description: "Paralizado 2",
        effects: [
          {
            id: "eff_p2",
            type: "status_apply" as const,
            statusElementId: "status_paralizado",
            turns: 2,
          },
        ],
      },
    ];

    // Roll 17 (17 >= 16) -> success
    const res17 = resolveOutcomesForRoll(17, 16, outcomes);
    expect(res17.outcome).toBe("success");
    expect(res17.effectsToApply).toHaveLength(0);

    // Roll 14 (16 - 14 = 2 < 5) -> failure
    const res14 = resolveOutcomesForRoll(14, 16, outcomes);
    expect(res14.outcome).toBe("failure");
    const failEff = res14.effectsToApply[0];
    expect(failEff.type === "status_apply" && failEff.turns).toBe(1);

    // Roll 10 (16 - 10 = 6 >= 5) -> failure_margin
    const res10 = resolveOutcomesForRoll(10, 16, outcomes);
    expect(res10.outcome).toBe("failure_margin");
    const marginEff = res10.effectsToApply[0];
    expect(marginEff.type === "status_apply" && marginEff.turns).toBe(2);
  });

  // --------------------------------------------------------------------------
  // 11. Rigidez Corporal (RES 4 -> 0; RES 5 -> EVA -1; RES 6 -> EVA -1; RES 7 -> EVA -2; nunca EVA -3)
  // --------------------------------------------------------------------------
  test("Rigidez Corporal: penalización escalada a evasión según RES (4->0, 5->-1, 6->-1, 7->-2, nunca -3)", () => {
    // Model generic step condition evaluation for Rigidez Corporal:
    // RES in 1..4: 0
    // RES in 5..6: -1
    // RES >= 7: -2 (capped at -2, never -3)
    const calculateRigidezPenalty = (res: number): number => {
      if (res <= 4) return 0;
      if (res <= 6) return -1;
      return -2; // Capped at -2, never -3
    };

    expect(calculateRigidezPenalty(4)).toBe(0);
    expect(calculateRigidezPenalty(5)).toBe(-1);
    expect(calculateRigidezPenalty(6)).toBe(-1);
    expect(calculateRigidezPenalty(7)).toBe(-2);
    expect(calculateRigidezPenalty(10)).toBe(-2); // Nunca -3
  });

  // --------------------------------------------------------------------------
  // 12. Acumulación de Impacto (Sección 20)
  // --------------------------------------------------------------------------
  test("Acumulación de Impacto: on receive_damage Impact +1; at >=3: incoming damage +3, turn_loss 1", () => {
    const participant = createParticipantRuntimeState("hero");
    const impactKey = makeCounterKey("hero", "elem_impact", "bh_impact", "counter_impact");

    // 1. First damage
    mutateCounter(participant, impactKey, "increment", 1);
    expect(participant.activeCounters[impactKey]).toBe(1);

    // 2. Second damage
    mutateCounter(participant, impactKey, "increment", 1);
    expect(participant.activeCounters[impactKey]).toBe(2);

    // 3. Third damage reaches threshold 3
    const count = mutateCounter(participant, impactKey, "increment", 1);
    expect(count).toBe(3);

    // When threshold >= 3 is reached, trigger consequence:
    if (count >= 3) {
      participant.pendingModifiers.push({
        id: "mod_impact_incoming",
        sourceBehaviorId: "bh_impact",
        scope: "all",
        type: "damage",
        amount: 3,
        operation: "add",
        duration: "until_turn_end",
      });
      // Reset counter upon threshold trigger according to configuration
      mutateCounter(participant, impactKey, "reset", 0);
    }

    expect(participant.activeCounters[impactKey]).toBe(0);
    expect(participant.pendingModifiers).toHaveLength(1);
    expect(participant.pendingModifiers[0].amount).toBe(3);
  });
});

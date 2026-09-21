import { describe, expect, test } from "vitest";
import {
  evaluateMechanicalConditions,
  checkResourceThresholdTransition,
  applyModifierMath,
  processDamagePipeline,
  processHealingPipeline,
  calculateEffectiveCost,
  resolveOutcomesForRoll,
  mutateCounter,
  checkLimitations,
  getActiveContinuousModifiers,
  createParticipantRuntimeState,
  createEncounterRuntimeState,
  advanceTurn,
  executeMechanicalBehavior,
  dispatchMechanicalEvent,
  makeCounterKey,
  type ConditionEvaluationContext,
} from "../mechanicalRuntime";
import type { RuleWorld } from "../ruleExecution";
import type { MechanicalBehavior } from "../mechanicalBehavior";

const makeTestWorld = (): RuleWorld => ({
  hero: {
    resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
    attributes: { FUE: 3, RES: 4 },
    barrier: 5,
    modifiers: [],
    statuses: [],
    inventory: { potion: 2 },
  },
  enemy: {
    resources: { SA: { current: 30, max: 30 }, ES: { current: 10, max: 20 } },
    attributes: { FUE: 2, RES: 2 },
    barrier: 0,
    modifiers: [],
    statuses: [],
    inventory: {},
  },
});

describe("MechanicalRuntime - Evaluador de Condiciones", () => {
  test("evalúa condición de recurso numérico y negación", () => {
    const world = makeTestWorld();
    const participant = createParticipantRuntimeState("hero");
    const ctx: ConditionEvaluationContext = { entity: world.hero, participant };

    expect(
      evaluateMechanicalConditions(
        [{ type: "resource", resourceId: "ES", comparison: ">=", value: 10 }],
        "all",
        ctx
      )
    ).toBe(true);

    expect(
      evaluateMechanicalConditions(
        [{ type: "resource", resourceId: "ES", comparison: ">", value: 10 }],
        "all",
        ctx
      )
    ).toBe(false);

    // Negated condition: NOT (ES > 10) => true
    expect(
      evaluateMechanicalConditions(
        [{ type: "resource", resourceId: "ES", comparison: ">", value: 10, negated: true }],
        "all",
        ctx
      )
    ).toBe(true);
  });

  test("evalúa condición de porcentaje de recurso (SA <= 50%)", () => {
    const world = makeTestWorld();
    const participant = createParticipantRuntimeState("hero");
    const ctx: ConditionEvaluationContext = { entity: world.hero, participant };

    // SA is 20/20 (100%)
    expect(
      evaluateMechanicalConditions(
        [{ type: "percentage", resourceId: "SA", comparison: "<=", percent: 50 }],
        "all",
        ctx
      )
    ).toBe(false);

    world.hero.resources.SA.current = 10; // 50%
    expect(
      evaluateMechanicalConditions(
        [{ type: "percentage", resourceId: "SA", comparison: "<=", percent: 50 }],
        "all",
        ctx
      )
    ).toBe(true);
  });

  test("evalúa condición de dados (dieSelection: both)", () => {
    const world = makeTestWorld();
    const participant = createParticipantRuntimeState("hero");
    const ctx: ConditionEvaluationContext = { entity: world.hero, participant, dice: [10, 10] };

    expect(
      evaluateMechanicalConditions(
        [{ type: "die", dieSelection: "both", comparison: "=", value: 10 }],
        "all",
        ctx
      )
    ).toBe(true);

    const ctxDifferent: ConditionEvaluationContext = { entity: world.hero, participant, dice: [10, 8] };
    expect(
      evaluateMechanicalConditions(
        [{ type: "die", dieSelection: "both", comparison: "=", value: 10 }],
        "all",
        ctxDifferent
      )
    ).toBe(false);
  });

  test("evalúa condición de tag en ataque o acción", () => {
    const world = makeTestWorld();
    const participant = createParticipantRuntimeState("hero");
    const ctx: ConditionEvaluationContext = {
      entity: world.hero,
      participant,
      attackTags: ["fire", "slash"],
    };

    expect(
      evaluateMechanicalConditions(
        [{ type: "tag", tag: "fire", scope: "attack" }],
        "all",
        ctx
      )
    ).toBe(true);

    expect(
      evaluateMechanicalConditions(
        [{ type: "tag", tag: "ice", scope: "attack" }],
        "all",
        ctx
      )
    ).toBe(false);
  });
});

describe("MechanicalRuntime - Transiciones de Umbral (cross_down)", () => {
  test("detecta cruce descendente activo y no dispara cuando ya estaba bajo el umbral", () => {
    // 1. Previous 5, current 3, threshold 3, cross_down => true
    expect(checkResourceThresholdTransition(5, 3, 3, "cross_down")).toBe(true);

    // 2. Previous 3, current 2, threshold 3, cross_down => false (ya estaba en o bajo el umbral)
    expect(checkResourceThresholdTransition(3, 2, 3, "cross_down")).toBe(false);

    // 3. Previous undefined, current 2 => false
    expect(checkResourceThresholdTransition(undefined, 2, 3, "cross_down")).toBe(false);

    // 4. Upward transition
    expect(checkResourceThresholdTransition(2, 5, 4, "cross_up")).toBe(true);
  });
});

describe("MechanicalRuntime - Precedencia Matemática de Modificadores", () => {
  test("aplica set -> multiply/divide -> add/subtract determinísticamente", () => {
    // Base 10, set to 5, multiply by 2, add 4 => (5 * 2) + 4 = 14
    const result = applyModifierMath(10, [
      { operation: "add", amount: 4 },
      { operation: "multiply", amount: 2 },
      { operation: "set", amount: 5 },
    ]);
    expect(result).toBe(14);
  });
});

describe("MechanicalRuntime - Pipeline de Daño", () => {
  test("absorbe daño con barrera y aplica daño final a SA", () => {
    const world = makeTestWorld();
    const encounter = createEncounterRuntimeState();

    // Base damage 8 against hero with barrier 5
    const res = processDamagePipeline({
      baseDamage: 8,
      targetId: "hero",
      world,
      encounter,
    });

    expect(res.baseDamage).toBe(8);
    expect(res.absorbedByBarrier).toBe(5);
    expect(res.finalDamage).toBe(3);
    expect(res.newWorld.hero.barrier).toBe(0);
    expect(res.newWorld.hero.resources.SA.current).toBe(17);
  });

  test("aplica modificador de daño entrante filtrado por tag", () => {
    const world = makeTestWorld();
    const encounter = createEncounterRuntimeState();

    // Damage 10 fire with incoming +4 for fire tag
    const res = processDamagePipeline({
      baseDamage: 10,
      targetId: "enemy", // barrier 0
      tags: ["fire"],
      world,
      encounter,
      targetContinuousModifiers: [{ operation: "add", amount: 4, tagFilter: "fire" }],
    });

    expect(res.finalDamage).toBe(14);
    expect(res.newWorld.enemy.resources.SA.current).toBe(16);
  });
});

describe("MechanicalRuntime - Pipeline de Curación", () => {
  test("aplica modificadores entrantes de curación respetando el máximo", () => {
    const world = makeTestWorld();
    world.hero.resources.SA.current = 10; // max 20
    const encounter = createEncounterRuntimeState();

    // Base healing 5 with -1 incoming modifier => 4 healing
    const res = processHealingPipeline({
      baseHealing: 5,
      targetId: "hero",
      world,
      encounter,
      targetModifiers: [{ operation: "subtract", amount: 1 }],
    });

    expect(res.finalHealing).toBe(4);
    expect(res.actualAmountCredited).toBe(4);
    expect(res.newWorld.hero.resources.SA.current).toBe(14);
  });
});

describe("MechanicalRuntime - Pipeline de Costes y Pending Modifiers", () => {
  test("consume pending modifier x2 en el siguiente uso y no en los posteriores", () => {
    const encounter = createEncounterRuntimeState();
    const participant = createParticipantRuntimeState("hero");
    encounter.participants["hero"] = participant;

    // Register pending modifier x2 for quirk
    participant.pendingModifiers.push({
      id: "pending_1",
      sourceBehaviorId: "bh_test",
      scope: "quirk",
      type: "cost",
      amount: 2,
      operation: "multiply",
      duration: "until_next_use",
    });

    // 1. First Quirk use: base 3 => 6
    const first = calculateEffectiveCost({
      baseCost: 3,
      scope: "quirk",
      entityId: "hero",
      encounter,
    });
    expect(first.effectiveCost).toBe(6);
    expect(first.consumedPendingModifiers).toHaveLength(1);

    // 2. Following Quirk use: normal cost 3
    const second = calculateEffectiveCost({
      baseCost: 3,
      scope: "quirk",
      entityId: "hero",
      encounter,
    });
    expect(second.effectiveCost).toBe(3);
  });
});

describe("MechanicalRuntime - Márgenes de Resolución (RD)", () => {
  test("selecciona la rama más específica (failure_margin >= 5 sobre failure genérico)", () => {
    const outcomes = [
      {
        id: "out_fail",
        outcome: "failure" as const,
        description: "Paralizado 1",
        effects: [{ id: "eff1", type: "status_apply" as const, statusElementId: "paralizado", turns: 1 }],
      },
      {
        id: "out_margin",
        outcome: "failure_margin" as const,
        marginThreshold: 5,
        description: "Paralizado 2",
        effects: [{ id: "eff2", type: "status_apply" as const, statusElementId: "paralizado", turns: 2 }],
      },
      {
        id: "out_success",
        outcome: "success" as const,
        description: "Sin efecto",
        effects: [],
      },
    ];

    // Difficulty 16:
    // Roll 17 => success
    const resSuccess = resolveOutcomesForRoll(17, 16, outcomes);
    expect(resSuccess.outcome).toBe("success");
    expect(resSuccess.effectsToApply).toHaveLength(0);

    // Roll 14 => failure (distance 2 < 5) => matches out_fail
    const resFail = resolveOutcomesForRoll(14, 16, outcomes);
    expect(resFail.outcome).toBe("failure");
    const failEff = resFail.effectsToApply[0];
    expect(failEff.type === "status_apply" && failEff.turns).toBe(1);

    // Roll 10 => failure (distance 6 >= 5) => matches out_margin
    const resMargin = resolveOutcomesForRoll(10, 16, outcomes);
    expect(resMargin.outcome).toBe("failure_margin");
    const marginEff = resMargin.effectsToApply[0];
    expect(marginEff.type === "status_apply" && marginEff.turns).toBe(2);
  });
});

describe("MechanicalRuntime - Contadores y Reset de Turno", () => {
  test("incrementa contadores con límite cap y los actualiza correctamente", () => {
    const participant = createParticipantRuntimeState("hero");
    const cKey = makeCounterKey("hero", "elem1", "bh1", "counter1");

    mutateCounter(participant, cKey, "increment", 2, 3);
    expect(participant.activeCounters[cKey]).toBe(2);

    mutateCounter(participant, cKey, "increment", 2, 3);
    expect(participant.activeCounters[cKey]).toBe(3); // capped at 3
  });

  test("advanceTurn resetea acumuladores de este turno y preserva historial de turnos previos", () => {
    const encounter = createEncounterRuntimeState(1);
    const participant = createParticipantRuntimeState("hero", 1);
    encounter.participants["hero"] = participant;

    participant.damageReceivedThisTurn = 12;
    participant.esSpentThisTurn = 4;
    participant.usedQuirkThisTurn = true;

    const nextEncounter = advanceTurn(encounter);
    const nextHero = nextEncounter.participants["hero"];

    expect(nextEncounter.turn).toBe(2);
    expect(nextHero.damageReceivedThisTurn).toBe(0);
    expect(nextHero.esSpentThisTurn).toBe(0);
    expect(nextHero.usedQuirkPreviousTurn).toBe(true);
    expect(nextHero.usedQuirkThisTurn).toBe(false);
    expect(nextHero.consecutiveTurnsQuirkUsed).toBe(1);
  });
});

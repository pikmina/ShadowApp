import { describe, it, expect, beforeEach } from "vitest";
import {
  RuleWorld,
  EncounterRuntimeState,
  createParticipantRuntimeState,
  getActiveContinuousModifiers,
  dispatchMechanicalEvent,
  calculateEffectiveCost,
  evaluateMechanicalConditions,
  evaluateRequirements,
  syncWhileConditionEffects,
  executeMechanicalBehavior,
} from "../mechanicalRuntime";
import {
  MechanicalBehavior,
  normalizeMechanicalBehavior,
  MechanicalRequirement,
} from "../mechanicalBehavior";

describe("TAREA CE-4D — Triggers, Condiciones y Requisitos Mecánicos", () => {
  let world: RuleWorld;
  let encounter: EncounterRuntimeState;

  beforeEach(() => {
    world = {
      hero: {
        attributes: { fue: 4, des: 3, res: 4, int: 3, vol: 3, vel: 3 },
        resources: {
          SA: { current: 20, max: 20 },
          ES: { current: 10, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: { medkit: 2 },
      },
      enemy: {
        attributes: { fue: 5, des: 3, res: 5, int: 2, vol: 2, vel: 3 },
        resources: {
          SA: { current: 30, max: 30 },
          ES: { current: 10, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
    };

    encounter = {
      turn: 1,
      eventLog: [],
      traceLog: [],
      participants: {
        hero: createParticipantRuntimeState("hero"),
        enemy: createParticipantRuntimeState("enemy"),
      },
    };
  });

  // ==========================================================================
  // CASO A — Canalización Exigente (ES <= 50% -> Quirk cost +1)
  // ==========================================================================
  describe("CASO A — Canalización Exigente (While Condition Lifecycle)", () => {
    const canalizacionBehavior: MechanicalBehavior = normalizeMechanicalBehavior({
      id: "mb_canalizacion_exigente",
      name: "Canalización Exigente",
      mode: "continuous",
      conditions: [
        {
          type: "percentage",
          resourceId: "ES",
          comparison: "<=",
          percent: 50,
        },
      ],
      conditionLogic: "all",
      temporality: {
        duration: { type: "while_condition" },
      },
      effects: [
        {
          id: "eff_quirk_cost_plus_1",
          type: "cost_modifier",
          scopeId: "quirk",
          amount: 1,
          operation: "add",
        },
      ],
    });

    const owned = [{ elementId: "weakness_canalizacion", behavior: canalizacionBehavior }];

    it("coste de quirk no aumenta mientras ES > 50%", () => {
      world.hero.resources.ES.current = 10; // 100%
      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.costModifiers.length).toBe(0);

      const cost = calculateEffectiveCost({
        baseCost: 2,
        scope: "quirk",
        entityId: "hero",
        encounter,
        continuousModifiers: cont.costModifiers,
      });
      expect(cost.effectiveCost).toBe(2);
    });

    it("activa +1 coste cuando ES baja al 50% o menos (transición false -> true)", () => {
      world.hero.resources.ES.current = 5; // 50%
      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.costModifiers).toEqual(
        expect.arrayContaining([{ scopeId: "quirk", amount: 1, operation: "add" }])
      );

      const cost = calculateEffectiveCost({
        baseCost: 2,
        scope: "quirk",
        entityId: "hero",
        encounter,
        continuousModifiers: cont.costModifiers,
      });
      expect(cost.effectiveCost).toBe(3);
    });

    it("INVARIANTE: no duplica el penalizador si ES continúa bajando (40%, 30%)", () => {
      // ES al 50% -> +1 coste
      world.hero.resources.ES.current = 5;
      let cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.costModifiers.length).toBe(1);
      expect(cont.costModifiers[0].amount).toBe(1);

      // ES al 40% -> sigue siendo exactamente +1 (no +2)
      world.hero.resources.ES.current = 4;
      cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.costModifiers.length).toBe(1);
      expect(cont.costModifiers[0].amount).toBe(1);

      // ES al 30% -> sigue siendo exactamente +1 (no +3)
      world.hero.resources.ES.current = 3;
      cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.costModifiers.length).toBe(1);
      expect(cont.costModifiers[0].amount).toBe(1);

      const cost = calculateEffectiveCost({
        baseCost: 2,
        scope: "quirk",
        entityId: "hero",
        encounter,
        continuousModifiers: cont.costModifiers,
      });
      expect(cost.effectiveCost).toBe(3);
    });

    it("se desactiva automáticamente cuando ES supera el 50% (transición true -> false)", () => {
      // Estado activo a ES = 4
      world.hero.resources.ES.current = 4;
      let cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.costModifiers.length).toBe(1);

      // Recuperación a ES = 6 (60%)
      world.hero.resources.ES.current = 6;
      cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.costModifiers.length).toBe(0);

      const cost = calculateEffectiveCost({
        baseCost: 2,
        scope: "quirk",
        entityId: "hero",
        encounter,
        continuousModifiers: cont.costModifiers,
      });
      expect(cost.effectiveCost).toBe(2);
    });

    it("sincroniza en activeTimedEffects manteniendo una sola instancia activa", () => {
      // ES = 4 -> sincronizar activa la instancia
      world.hero.resources.ES.current = 4;
      encounter = syncWhileConditionEffects("hero", owned, world, encounter);
      expect(encounter.participants.hero.activeTimedEffects.length).toBe(1);
      expect(encounter.participants.hero.activeTimedEffects[0].sourceBehaviorId).toBe("mb_canalizacion_exigente");

      // ES = 3 -> sincronizar de nuevo NO duplica
      world.hero.resources.ES.current = 3;
      encounter = syncWhileConditionEffects("hero", owned, world, encounter);
      expect(encounter.participants.hero.activeTimedEffects.length).toBe(1);

      // ES = 7 -> sincronizar retira el efecto
      world.hero.resources.ES.current = 7;
      encounter = syncWhileConditionEffects("hero", owned, world, encounter);
      expect(encounter.participants.hero.activeTimedEffects.length).toBe(0);
    });
  });

  // ==========================================================================
  // CASO B — Punto de Quiebre (SA <= 50% -> -2 tiradas de acción)
  // ==========================================================================
  describe("CASO B — Punto de Quiebre (SA <= 50% -> -2 en tiradas de acción)", () => {
    const puntoQuiebreBehavior: MechanicalBehavior = normalizeMechanicalBehavior({
      id: "mb_punto_quiebre",
      name: "Punto de Quiebre",
      mode: "continuous",
      conditions: [
        {
          type: "percentage",
          resourceId: "SA",
          comparison: "<=",
          percent: 50,
        },
      ],
      conditionLogic: "all",
      temporality: {
        duration: { type: "while_condition" },
      },
      effects: [
        {
          id: "eff_punto_quiebre_penalty",
          type: "roll_modifier",
          rollType: "action",
          amount: -2,
          operation: "add",
        },
      ],
    });

    const owned = [{ elementId: "weakness_punto_de_quiebre", behavior: puntoQuiebreBehavior }];

    it("no aplica penalizador con SA al 100% (20/20)", () => {
      world.hero.resources.SA.current = 20;
      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.rollModifiers.length).toBe(0);
    });

    it("aplica -2 a tiradas de acción cuando SA cae al 50% (10/20)", () => {
      world.hero.resources.SA.current = 10;
      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.rollModifiers).toEqual(
        expect.arrayContaining([{ rollType: "action", amount: -2, operation: "add" }])
      );
    });

    it("INVARIANTE: no acumula -4 al caer a 8/20 o 5/20 de SA", () => {
      world.hero.resources.SA.current = 8;
      let cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.rollModifiers.length).toBe(1);
      expect(cont.rollModifiers[0].amount).toBe(-2);

      world.hero.resources.SA.current = 5;
      cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.rollModifiers.length).toBe(1);
      expect(cont.rollModifiers[0].amount).toBe(-2);
    });

    it("se retira automáticamente al curarse por encima de 50% (15/20)", () => {
      world.hero.resources.SA.current = 8;
      let cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.rollModifiers.length).toBe(1);

      world.hero.resources.SA.current = 15;
      cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.rollModifiers.length).toBe(0);
    });
  });

  // ==========================================================================
  // CASO C — Acumulación de Impacto (Filtros de Trigger + Contadores)
  // ==========================================================================
  describe("CASO C — Acumulación de Impacto (Filtros de Trigger)", () => {
    const acumulacionCounter: MechanicalBehavior = normalizeMechanicalBehavior({
      id: "mb_acumulacion_counter",
      name: "Contador de Impacto",
      mode: "reactive",
      trigger: {
        kind: "damage_received",
        filters: {
          sourceEntityType: ["character", "npc"],
        },
      },
      conditions: [],
      effects: [
        {
          id: "eff_inc_impacto",
          type: "counter_modifier",
          counterId: "impacto",
          operation: "increment",
          value: 1,
        },
      ],
    });

    const acumulacionThreshold: MechanicalBehavior = normalizeMechanicalBehavior({
      id: "mb_acumulacion_threshold",
      name: "Umbral de 3 Impactos",
      mode: "reactive",
      trigger: {
        kind: "damage_received",
        filters: {
          sourceEntityType: ["character", "npc"],
        },
      },
      conditions: [
        {
          type: "counter",
          counterId: "impacto",
          comparison: ">=",
          value: 3,
        },
      ],
      effects: [
        {
          id: "eff_acumulacion_dmg_penalty",
          type: "incoming_damage_modifier",
          amount: 3,
          operation: "add",
        },
        {
          id: "eff_acumulacion_turn_loss",
          type: "turn_loss",
          turns: 1,
        },
      ],
      control: {
        reset: {
          event: "trigger_resolution",
          target: "counter",
        },
      },
    });

    const owned = [
      { elementId: "weakness_acumulacion", behavior: acumulacionCounter },
      { elementId: "weakness_acumulacion", behavior: acumulacionThreshold },
    ];

    it("NO incrementa el contador de impacto si el daño proviene de un estado alterado (veneno/sangrado)", () => {
      const res = dispatchMechanicalEvent({
        event: {
          kind: "damage_received",
          sourceEntityId: "status_poison",
          targetEntityId: "hero",
          sourceEntityType: "status",
          damage: { amount: 3, sourceEntityType: "status", origin: "poison" },
        },
        world,
        encounter,
        ownedBehaviors: owned,
      });

      const counterKey = "hero:weakness_acumulacion:mb_acumulacion_counter:impacto";
      expect(res.newEncounter.participants.hero.activeCounters[counterKey] ?? 0).toBe(0);
      expect(res.executedBehaviors.length).toBe(0);
    });

    it("NO incrementa el contador si el daño es autoinfligido por debilidad sin atacante válido", () => {
      const res = dispatchMechanicalEvent({
        event: {
          kind: "damage_received",
          sourceEntityId: "weakness_retroceso",
          targetEntityId: "hero",
          sourceEntityType: "weakness",
          damage: { amount: 2, sourceEntityType: "weakness" },
        },
        world,
        encounter,
        ownedBehaviors: owned,
      });

      const counterKey = "hero:weakness_acumulacion:mb_acumulacion_counter:impacto";
      expect(res.newEncounter.participants.hero.activeCounters[counterKey] ?? 0).toBe(0);
      expect(res.executedBehaviors.length).toBe(0);
    });

    it("incrementa contador solo con atacantes válidos (character / npc) y dispara umbral al 3er impacto", () => {
      const counterKey = "hero:weakness_acumulacion:mb_acumulacion_counter:impacto";

      // 1er impacto de enemigo PNJ
      const res1 = dispatchMechanicalEvent({
        event: {
          kind: "damage_received",
          sourceEntityId: "enemy",
          targetEntityId: "hero",
          sourceEntityType: "npc",
          damage: { amount: 4, sourceEntityId: "enemy", sourceEntityType: "npc" },
        },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      world = res1.newWorld;
      encounter = res1.newEncounter;
      expect(encounter.participants.hero.activeCounters[counterKey]).toBe(1);
      expect(encounter.participants.hero.turnLoss).toBe(0);

      // Daño intermediario de veneno (status) -> el contador DEBE permanecer en 1
      const resStatus = dispatchMechanicalEvent({
        event: {
          kind: "damage_received",
          sourceEntityId: "status_burn",
          targetEntityId: "hero",
          sourceEntityType: "status",
        },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      world = resStatus.newWorld;
      encounter = resStatus.newEncounter;
      expect(encounter.participants.hero.activeCounters[counterKey]).toBe(1);

      // 2do impacto de enemigo PJ / PNJ
      const res2 = dispatchMechanicalEvent({
        event: {
          kind: "damage_received",
          sourceEntityId: "enemy",
          targetEntityId: "hero",
          sourceEntityType: "npc",
        },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      world = res2.newWorld;
      encounter = res2.newEncounter;
      expect(encounter.participants.hero.activeCounters[counterKey]).toBe(2);
      expect(encounter.participants.hero.turnLoss).toBe(0);

      // 3er impacto de enemigo PJ / PNJ -> Se alcanza umbral 3
      const res3 = dispatchMechanicalEvent({
        event: {
          kind: "damage_received",
          sourceEntityId: "enemy",
          targetEntityId: "hero",
          sourceEntityType: "character",
        },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      world = res3.newWorld;
      encounter = res3.newEncounter;

      // Se aplicó turn_loss = 1
      expect(encounter.participants.hero.turnLoss).toBe(1);
      // Se aplicó modificador de daño +3
      const dmgMods = res3.appliedEffects.filter((e) => e.type === "incoming_damage_modifier");
      expect(dmgMods.length).toBeGreaterThanOrEqual(1);
      expect(dmgMods[0].amount).toBe(3);
    });
  });

  // ==========================================================================
  // CASO D — Técnica con Requisitos Mixtos (Manual + Automático)
  // ==========================================================================
  describe("CASO D — Técnica con Requisitos Mixtos (Manual + Automático)", () => {
    const requirements: MechanicalRequirement[] = [
      {
        id: "req_contact",
        type: "physical_contact",
        resolution: "manual",
        description: "Contacto físico requerido con el objetivo",
      },
      {
        id: "req_conscious",
        type: "target_conscious",
        resolution: "automatic",
        description: "El objetivo debe estar consciente",
      },
    ];

    const tecnicaDrenaje: MechanicalBehavior = normalizeMechanicalBehavior({
      id: "mb_drenaje_vital",
      name: "Drenaje Vital",
      mode: "active",
      activation: { actionType: "action", timing: "immediate" },
      requirements,
      effects: [
        {
          id: "eff_drain_damage",
          type: "damage",
          dice: "2D6",
        },
        {
          id: "eff_drain_healing",
          type: "healing",
          resourceId: "SA",
          amount: 4,
        },
      ],
    });

    it("Escenario 1: Objetivo consciente, pero contacto físico NO confirmado por el Master -> UNRESOLVED", () => {
      // Target consciente (SA = 30)
      world.enemy.resources.SA.current = 30;

      const evalRes = evaluateRequirements(requirements, {
        sourceEntityId: "hero",
        targetEntityId: "enemy",
        world,
        encounter,
        confirmedManualSignals: [], // No confirmado
      });

      expect(evalRes.satisfied).toBe(false);
      expect(evalRes.requiresManualResolution).toBe(true);
      expect(evalRes.unresolved.map((r) => r.id)).toEqual(["req_contact"]);
      expect(evalRes.failed).toEqual([]);

      // Si se intenta ejecutar en el motor sin confirmar, se bloquea la activación
      const execRes = executeMechanicalBehavior({
        behavior: tecnicaDrenaje,
        sourceEntityId: "hero",
        targetEntityId: "enemy",
        world,
        encounter,
        signals: [],
      });
      expect(execRes.success).toBe(false);
      expect(execRes.appliedEffects.length).toBe(0);
    });

    it("Escenario 2: Contacto físico confirmado, pero objetivo inconsciente (SA <= 0) -> FAILED", () => {
      // Target inconsciente
      world.enemy.resources.SA.current = 0;

      const evalRes = evaluateRequirements(requirements, {
        sourceEntityId: "hero",
        targetEntityId: "enemy",
        world,
        encounter,
        confirmedManualSignals: ["physical_contact"], // Confirmado
      });

      expect(evalRes.satisfied).toBe(false);
      expect(evalRes.requiresManualResolution).toBe(false);
      expect(evalRes.unresolved).toEqual([]);
      expect(evalRes.failed.map((r) => r.id)).toEqual(["req_conscious"]);

      // Ejecución bloqueada por fallo automático
      const execRes = executeMechanicalBehavior({
        behavior: tecnicaDrenaje,
        sourceEntityId: "hero",
        targetEntityId: "enemy",
        world,
        encounter,
        signals: ["physical_contact"],
      });
      expect(execRes.success).toBe(false);
      expect(execRes.reasons).toEqual(expect.arrayContaining(["El objetivo no está consciente"]));
    });

    it("Escenario 3: Contacto físico confirmado Y objetivo consciente -> SATISFIED (ejecución exitosa)", () => {
      world.enemy.resources.SA.current = 30;

      const evalRes = evaluateRequirements(requirements, {
        sourceEntityId: "hero",
        targetEntityId: "enemy",
        world,
        encounter,
        confirmedManualSignals: ["physical_contact"],
      });

      expect(evalRes.satisfied).toBe(true);
      expect(evalRes.requiresManualResolution).toBe(false);
      expect(evalRes.unresolved).toEqual([]);
      expect(evalRes.failed).toEqual([]);

      // Ejecución permitida
      const execRes = executeMechanicalBehavior({
        behavior: tecnicaDrenaje,
        sourceEntityId: "hero",
        targetEntityId: "enemy",
        world,
        encounter,
        signals: ["physical_contact"],
      });
      expect(execRes.success).toBe(true);
      expect(execRes.appliedEffects.length).toBe(2);
    });
  });

  // ==========================================================================
  // Condiciones de Dados Estructurados (Dice Conditions)
  // ==========================================================================
  describe("Condiciones de Dados Estructurados", () => {
    it("evalúa pareja exacta [10, 10] (Doble 10)", () => {
      const condition = {
        type: "die" as const,
        dieSelection: "pair" as const,
        pair: [10, 10],
      };

      const ctxSuccess = {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [10, 10],
      };
      expect(evaluateMechanicalConditions([condition], "all", ctxSuccess)).toBe(true);

      const ctxFail = {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [10, 9],
      };
      expect(evaluateMechanicalConditions([condition], "all", ctxFail)).toBe(false);
    });

    it("evalúa grupo ANY: [9, 9] O [10, 10]", () => {
      const conditionGroup = {
        type: "group" as const,
        logic: "any" as const,
        conditions: [
          { type: "die" as const, dieSelection: "pair" as const, pair: [9, 9] },
          { type: "die" as const, dieSelection: "pair" as const, pair: [10, 10] },
        ],
      };

      expect(evaluateMechanicalConditions([conditionGroup], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [9, 9],
      })).toBe(true);

      expect(evaluateMechanicalConditions([conditionGroup], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [10, 10],
      })).toBe(true);

      expect(evaluateMechanicalConditions([conditionGroup], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [8, 8],
      })).toBe(false);
    });

    it("evalúa si algún dado individual está entre 1 y 5", () => {
      const condition = {
        type: "die" as const,
        dieSelection: "any" as const,
        min: 1,
        max: 5,
      };

      // Un dado es 3 (entre 1 y 5) y el otro 8
      expect(evaluateMechanicalConditions([condition], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [3, 8],
      })).toBe(true);

      // Ambos son mayores a 5
      expect(evaluateMechanicalConditions([condition], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [6, 9],
      })).toBe(false);
    });

    it("evalúa dados dobles genéricos (dieSelection: double)", () => {
      const condition = {
        type: "die" as const,
        dieSelection: "double" as const,
      };

      expect(evaluateMechanicalConditions([condition], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [7, 7],
      })).toBe(true);

      expect(evaluateMechanicalConditions([condition], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
        dice: [7, 8],
      })).toBe(false);
    });
  });

  // ==========================================================================
  // Condición de Habilidad / Técnica Activa (active_behavior)
  // ==========================================================================
  describe("Condición de Habilidad o Técnica Activa", () => {
    it("verifica la presencia de otro MechanicalBehavior activo en el participante", () => {
      const condition = {
        type: "active_behavior" as const,
        behaviorId: "mb_postura_defensiva",
        present: true,
      };

      // Sin efecto activo
      expect(evaluateMechanicalConditions([condition], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
      })).toBe(false);

      // Con efecto activo en activeTimedEffects
      encounter.participants.hero.activeTimedEffects.push({
        id: "timed_defensiva_1",
        sourceBehaviorId: "mb_postura_defensiva",
        sourceEntityId: "hero",
        targetEntityId: "hero",
        effect: { id: "eff_def", type: "derived_stat_modifier", statId: "eva", amount: 2, operation: "add" },
        temporality: { duration: { type: "turns", turns: 2 } },
      });

      expect(evaluateMechanicalConditions([condition], "all", {
        entity: world.hero,
        participant: encounter.participants.hero,
      })).toBe(true);
    });
  });
});

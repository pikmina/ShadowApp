import { describe, it, expect } from "vitest";
import {
  mechanicalDurationSchema,
  mechanicalPeriodicitySchema,
  mechanicalTemporalitySchema,
  mechanicalActivationSchema,
  mechanicalLimitationSchema,
  mechanicalBehaviorSchema,
  normalizeMechanicalTemporality,
  type MechanicalBehavior,
} from "../mechanicalBehavior";
import {
  describeMechanicalBehavior,
  describeMechanicalTemporality,
  describeMechanicalActivation,
  describeMechanicalLimitation,
} from "../mechanicalDescription";
import {
  executeMechanicalBehavior,
  advanceTurn,
  createEncounterRuntimeState,
  createParticipantRuntimeState,
  getActiveContinuousModifiers,
  type RuleWorld,
} from "../mechanicalRuntime";
import {
  calculateTechniqueStructuralCost,
} from "../systemMechanics";
import {
  createCoreCategories,
} from "../coreRuleCatalog";

describe("TAREA CE-4C — Composición de Temporalidad, Activación, Periodicidad, Cooldown y Límites de Uso", () => {
  const coreCategories = createCoreCategories();

  // =========================================================================
  // 1. INVARIANTE: EFECTO ≠ TEMPORALIDAD Y NORMALIZACIÓN IDEMPOTENTE
  // =========================================================================
  describe("1. Invariante Canónica de Temporalidad y Normalización Idempotente", () => {
    it("A. Si duration.type === 'instant', duration no retiene turns/value y periodicity es 'once'", () => {
      const raw = {
        duration: { type: "instant", turns: 3, value: 3 },
        periodicity: { mode: "each_turn", timing: "turn_start" },
      };

      const normalized = normalizeMechanicalTemporality(raw);
      expect(normalized.duration.type).toBe("instant");
      expect((normalized.duration as any).turns).toBeUndefined();
      expect((normalized.duration as any).value).toBeUndefined();
      expect(normalized.periodicity.mode).toBe("once");
      expect((normalized.periodicity as any).timing).toBeUndefined();

      // Idempotencia: normalize(normalize(x)) === normalize(x)
      const doubleNormalized = normalizeMechanicalTemporality(normalized);
      expect(doubleNormalized).toEqual(normalized);
    });

    it("B. Si duration.type === 'turns', turns y value se conservan e idempotencia garantizada", () => {
      const raw = {
        duration: { type: "turns", turns: 2 },
        periodicity: { mode: "once" },
      };

      const normalized = normalizeMechanicalTemporality(raw);
      expect(normalized.duration.type).toBe("turns");
      expect(normalized.duration.turns).toBe(2);
      expect(normalized.duration.value).toBe(2);
      expect(normalized.periodicity.mode).toBe("once");

      const doubleNormalized = normalizeMechanicalTemporality(normalized);
      expect(doubleNormalized).toEqual(normalized);
    });

    it("C. Periodicidad 'each_turn' conserva timing (turn_start / turn_end) de forma idempotente", () => {
      const raw = {
        duration: { type: "turns", turns: 3 },
        periodicity: { mode: "each_turn", timing: "turn_end" },
      };

      const normalized = normalizeMechanicalTemporality(raw);
      expect(normalized.periodicity.mode).toBe("each_turn");
      expect(normalized.periodicity.timing).toBe("turn_end");

      const doubleNormalized = normalizeMechanicalTemporality(normalized);
      expect(doubleNormalized).toEqual(normalized);
    });

    it("D. Armoniza frequency legacy con periodicity", () => {
      const legacy = {
        duration: { type: "turns", turns: 2 },
        frequency: { type: "each_turn" },
      };

      const normalized = normalizeMechanicalTemporality(legacy);
      expect(normalized.periodicity.mode).toBe("each_turn");
      expect(normalized.periodicity.timing).toBe("turn_start");
    });

    it("E. mechanicalActivationSchema armoniza turns y delay e idempotencia garantizada", () => {
      const act = mechanicalActivationSchema.parse({
        actionType: "action",
        timing: "turns",
        delay: 2,
      });
      expect(act.timing).toBe("turns");
      expect(act.turns).toBe(2);
      expect(act.delay).toBe(2);

      const doubleAct = mechanicalActivationSchema.parse(act);
      expect(doubleAct).toEqual(act);

      // Si timing es immediate o turns es 0, limpia delay
      const imm = mechanicalActivationSchema.parse({
        actionType: "quick_action",
        timing: "immediate",
        delay: 2,
        turns: 2,
      });
      expect(imm.timing).toBe("immediate");
      expect(imm.turns).toBe(0);
      expect(imm.delay).toBe(0);
    });

    it("F. mechanicalLimitationSchema normaliza cooldown y usage_limit de forma idempotente", () => {
      const cd = mechanicalLimitationSchema.parse({
        type: "cooldown",
        turns: 2,
      });
      expect(cd.type).toBe("cooldown");
      if (cd.type === "cooldown") {
        expect(cd.turns).toBe(2);
      }
      expect((cd as any).period).toBeUndefined();

      const doubleCd = mechanicalLimitationSchema.parse(cd);
      expect(doubleCd).toEqual(cd);

      const usage = mechanicalLimitationSchema.parse({
        type: "usage_limit",
        period: "combat",
        max: 2,
      });
      expect(usage.type).toBe("usage_limit");
      if (usage.type === "usage_limit") {
        expect(usage.period).toBe("combat");
        expect(usage.max).toBe(2);
      }
      expect((usage as any).turns).toBeUndefined();

      const doubleUsage = mechanicalLimitationSchema.parse(usage);
      expect(doubleUsage).toEqual(usage);
    });
  });

  // =========================================================================
  // 2. DESCRIPCIÓN AUTOMÁTICA NATURAL
  // =========================================================================
  describe("2. Generación de Descripción Mecánica", () => {
    it("A. Efecto compositivo de modificador con duración por turnos", () => {
      const b: MechanicalBehavior = {
        id: "b_buff",
        name: "Fuerza Desatada",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        limitations: [],
        target: { type: "self" },
        effects: [
          {
            id: "e1",
            type: "attribute_modifier",
            attributeId: "FUE",
            amount: 2,
            operation: "add",
          },
        ],
        temporality: {
          duration: { type: "turns", turns: 2 },
          periodicity: { mode: "once" },
        },
      };

      const desc = describeMechanicalBehavior(b, { format: "compact" });
      expect(desc.text).toContain("Otorga +2 a Fuerza (FUE).");
      expect(desc.text).toContain("Durante 2 turnos.");
    });

    it("B. Efecto de daño periódico: Inflige 1D6 al inicio de cada turno durante 3 turnos", () => {
      const b: MechanicalBehavior = {
        id: "b_burn",
        name: "Quemadura Solar",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        limitations: [],
        target: { type: "enemy", quantity: { mode: "up_to", count: 1 } },
        effects: [
          {
            id: "e1",
            type: "damage",
            dice: "1D6",
            damageType: "fuego",
          },
        ],
        temporality: {
          duration: { type: "turns", turns: 3 },
          periodicity: { mode: "each_turn", timing: "turn_start" },
        },
      };

      const desc = describeMechanicalBehavior(b, { format: "compact" });
      expect(desc.text).toContain("Inflige 1D6 de daño de tipo Fuego a un enemigo.");
      expect(desc.text).toContain("Al inicio de cada turno durante 3 turnos.");
    });

    it("C. Activación retardada: Tarda 1 turno en activarse", () => {
      const b: MechanicalBehavior = {
        id: "b_delayed",
        name: "Golpe Cargado",
        mode: "active",
        activation: {
          actionType: "action",
          timing: "turns",
          turns: 1,
          delay: 1,
          description: "",
        },
        conditions: [],
        conditionLogic: "all",
        limitations: [],
        target: { type: "enemy", quantity: { mode: "up_to", count: 1 } },
        effects: [
          {
            id: "e1",
            type: "damage",
            dice: "4D6",
          },
        ],
      };

      const desc = describeMechanicalBehavior(b, { format: "compact" });
      expect(desc.text).toContain("Tarda 1 turno en activarse.");
    });

    it("D. Cooldown y límite de uso en descripción", () => {
      const b: MechanicalBehavior = {
        id: "b_limited",
        name: "Técnica Definitiva",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        limitations: [
          { id: "l1", type: "cooldown", turns: 2 },
          { id: "l2", type: "usage_limit", period: "combat", max: 1 },
        ],
        target: { type: "self" },
        effects: [
          { id: "e1", type: "barrier", amount: 20 },
        ],
      };

      const desc = describeMechanicalBehavior(b, { format: "compact" });
      expect(desc.text).toContain("Tiempo de recarga: 2 turnos.");
      expect(desc.text).toContain("1 vez por combate.");
    });
  });

  // =========================================================================
  // 3. CÁLCULO DE COSTE CE COMPOSITIVO
  // =========================================================================
  describe("3. Cálculo Compositivo de CE", () => {
    it("A. Duración suma coste de CE según turnos configurados", () => {
      // 2 turnos de duración (+1 CE en core categories)
      const b: MechanicalBehavior = {
        id: "b1",
        name: "Test Behavior",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        limitations: [],
        effects: [
          { id: "e1", type: "derived_stat_modifier", statId: "EVA", amount: 3, operation: "add" }, // +2 CE (stat) + 2 CE (bonus 3) = 4
        ],
        temporality: {
          duration: { type: "turns", turns: 2 }, // +1 CE
        },
      };

      const cost = calculateTechniqueStructuralCost([b], coreCategories, {
        techniqueByLevel: [{ level: 1, cost: 1 }],
      } as any);

      // 4 (EVA +3) + 1 (2 turnos) = 5 CE
      expect(cost).toBe(5);
    });

    it("B. Cooldown reduce el coste de CE según turnos configurados", () => {
      const b: MechanicalBehavior = {
        id: "b1",
        name: "Test Behavior",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        effects: [
          { id: "e1", type: "derived_stat_modifier", statId: "EVA", amount: 3, operation: "add" }, // 4 CE
        ],
        temporality: {
          duration: { type: "turns", turns: 2 }, // +1 CE
        },
        limitations: [
          { id: "l1", type: "cooldown", turns: 2 }, // -2 CE
        ],
      };

      const cost = calculateTechniqueStructuralCost([b], coreCategories, {
        techniqueByLevel: [{ level: 1, cost: 1 }],
      } as any);

      // 4 + 1 - 2 = 3 CE (mínimo nivel 1 es 1)
      expect(cost).toBe(3);
    });
  });

  // =========================================================================
  // 4. SEMÁNTICA TEMPORAL DE RUNTIME (INVARIANTE DE TURNOS)
  // =========================================================================
  describe("4. Runtime: Semántica de Turnos y Efectos Temporales", () => {
    it("A. Invariante: El turno de aplicación NO consume duración; concede N turnos posteriores completos", () => {
      const world: RuleWorld = {
        hero: {
          id: "hero",
          name: "Deku",
          faction: "heroes",
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1); // Turno 1

      // Deku aplica +2 FUE durante 2 turnos en Turno 1
      const buffBehavior: MechanicalBehavior = {
        id: "b_buff_fue",
        name: "One For All 5%",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        limitations: [],
        target: { type: "self" },
        effects: [
          {
            id: "e1",
            type: "attribute_modifier",
            attributeId: "FUE",
            amount: 2,
            operation: "add",
          },
        ],
        temporality: {
          duration: { type: "turns", turns: 2 },
          periodicity: { mode: "once" },
        },
      };

      const execRes = executeMechanicalBehavior({
        behavior: buffBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });

      expect(execRes.success).toBe(true);
      encounter = execRes.newEncounter;

      // En Turno 1 (aplicación): el modificador está activo
      let part = encounter.participants["hero"];
      let mods = getActiveContinuousModifiers([], world.hero, part, world);
      let fueMod = mods.attributeModifiers.find((m) => m.attributeId === "FUE");
      expect(fueMod?.amount).toBe(2);

      // Avanzamos a Turno 2 (1er turno posterior completo): DEBE PERMANECER ACTIVO
      encounter = advanceTurn(encounter, {}, world);
      expect(encounter.turn).toBe(2);
      part = encounter.participants["hero"];
      mods = getActiveContinuousModifiers([], world.hero, part, world);
      fueMod = mods.attributeModifiers.find((m) => m.attributeId === "FUE");
      expect(fueMod?.amount).toBe(2);

      // Avanzamos a Turno 3 (2do turno posterior completo): DEBE PERMANECER ACTIVO
      encounter = advanceTurn(encounter, {}, world);
      expect(encounter.turn).toBe(3);
      part = encounter.participants["hero"];
      mods = getActiveContinuousModifiers([], world.hero, part, world);
      fueMod = mods.attributeModifiers.find((m) => m.attributeId === "FUE");
      expect(fueMod?.amount).toBe(2);

      // Avanzamos a Turno 4 (después de 2 turnos completos): DEBE HABER EXPIRADO
      encounter = advanceTurn(encounter, {}, world);
      expect(encounter.turn).toBe(4);
      part = encounter.participants["hero"];
      mods = getActiveContinuousModifiers([], world.hero, part, world);
      fueMod = mods.attributeModifiers.find((m) => m.attributeId === "FUE");
      expect(fueMod).toBeUndefined();
    });

    it("B. Daño Periódico: Ejecuta tick de daño en turnos posteriores al inicio del turno", () => {
      let world: RuleWorld = {
        villain: {
          id: "villain",
          name: "Toga",
          faction: "villains",
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 4, DES: 6, RES: 4, INT: 5, VOL: 4, VEL: 6 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);

      // Se aplica daño periódico de 4 durante 2 turnos a Toga en Turno 1
      const dotBehavior: MechanicalBehavior = {
        id: "b_dot",
        name: "Veneno Concentrado",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        limitations: [],
        target: { type: "enemy" },
        effects: [
          {
            id: "e_dot",
            type: "damage",
            amount: 4,
            dice: "4",
          } as any,
        ],
        temporality: {
          duration: { type: "turns", turns: 2 },
          periodicity: { mode: "each_turn", timing: "turn_start" },
        },
      };

      const execRes = executeMechanicalBehavior({
        behavior: dotBehavior,
        sourceEntityId: "villain",
        targetEntityId: "villain",
        world,
        encounter,
      });

      expect(execRes.success).toBe(true);
      world = execRes.newWorld;
      encounter = execRes.newEncounter;

      // Turno 1: Se aplica el daño inicial (30 - 4 = 26)
      expect(world.villain.resources.SA.current).toBe(26);

      // Avanzamos a Turno 2: Tick periódico se dispara al inicio del turno
      encounter = advanceTurn(encounter, {}, world);
      // El tick inflige 4 de daño (26 - 4 = 22)
      expect(world.villain.resources.SA.current).toBe(22);

      // Avanzamos a Turno 3: Segundo tick periódico se dispara
      encounter = advanceTurn(encounter, {}, world);
      expect(world.villain.resources.SA.current).toBe(18);

      // Avanzamos a Turno 4: Duración expirada, no debe recibir más ticks
      encounter = advanceTurn(encounter, {}, world);
      expect(world.villain.resources.SA.current).toBe(18);
    });

    it("C. Activación retardada: No se ejecuta en Turno 1, se dispara al cumplirse los turnos de retardo", () => {
      let world: RuleWorld = {
        hero: {
          id: "hero",
          name: "Deku",
          faction: "heroes",
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: "dummy",
          name: "Muñeco de prueba",
          faction: "neutral",
          resources: { SA: { current: 50, max: 50 }, ES: { current: 20, max: 20 } },
          attributes: { FUE: 1, DES: 1, RES: 1, INT: 1, VOL: 1, VEL: 1 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);

      // Habilidad con retardo de 1 turno (se prepara en turno 1, se dispara en turno 2)
      const delayedAttack: MechanicalBehavior = {
        id: "b_delayed_atk",
        name: "Golpe Smash Preparado",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        limitations: [],
        activation: {
          actionType: "action",
          timing: "turns",
          turns: 1,
          delay: 1,
          description: "",
        },
        target: { type: "enemy" },
        effects: [
          {
            id: "e_dmg",
            type: "damage",
            amount: 10,
            dice: "10",
          } as any,
        ],
      };

      const execRes = executeMechanicalBehavior({
        behavior: delayedAttack,
        sourceEntityId: "hero",
        targetEntityId: "dummy",
        world,
        encounter,
      });

      expect(execRes.success).toBe(true);
      world = execRes.newWorld;
      encounter = execRes.newEncounter;

      // En Turno 1: NO inflige daño inmediato
      expect(world.dummy.resources.SA.current).toBe(50);

      // Avanzamos a Turno 2: La activación retardada se resuelve automáticamente
      encounter = advanceTurn(encounter, {}, world);
      // dummy recibe 10 de daño (50 - 10 = 40)
      expect(world.dummy.resources.SA.current).toBe(40);
    });

    it("D. Cooldown: Bloquea la reutilización hasta que transcurran los turnos requeridos", () => {
      const world: RuleWorld = {
        hero: {
          id: "hero",
          name: "Deku",
          faction: "heroes",
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);

      const cdBehavior: MechanicalBehavior = {
        id: "b_cd",
        name: "Escudo Rápido",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        target: { type: "self" },
        effects: [{ id: "e1", type: "barrier", amount: 10 }],
        limitations: [{ id: "l1", type: "cooldown", turns: 2 }],
      };

      // 1. Ejecutar en Turno 1
      const res1 = executeMechanicalBehavior({
        behavior: cdBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });
      expect(res1.success).toBe(true);
      encounter = res1.newEncounter;

      // Intentar ejecutar de nuevo en Turno 1 -> BLOQUEADO por cooldown
      const res1Repeat = executeMechanicalBehavior({
        behavior: cdBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });
      expect(res1Repeat.success).toBe(false);
      expect(res1Repeat.reasons).toContain("Limitations violated");

      // Avanzar a Turno 2 -> Cooldown sigue activo (falta 1 turno)
      encounter = advanceTurn(encounter, {}, world);
      const res2 = executeMechanicalBehavior({
        behavior: cdBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });
      expect(res2.success).toBe(false);

      // Avanzar a Turno 3 -> Cooldown sigue activo (segundo turno transcurriendo)
      encounter = advanceTurn(encounter, {}, world);
      const res3 = executeMechanicalBehavior({
        behavior: cdBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });
      expect(res3.success).toBe(false);

      // Avanzar a Turno 4 -> Cooldown ha expirado (2 turnos completados), ahora disponible
      encounter = advanceTurn(encounter, {}, world);
      const res4 = executeMechanicalBehavior({
        behavior: cdBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });
      expect(res4.success).toBe(true);
    });

    it("E. Límite de uso por turno se resetea en cada turno", () => {
      const world: RuleWorld = {
        hero: {
          id: "hero",
          name: "Deku",
          faction: "heroes",
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);

      const perTurnBehavior: MechanicalBehavior = {
        id: "b_per_turn",
        name: "Paso Veloz",
        mode: "active",
        conditions: [],
        conditionLogic: "all",
        target: { type: "self" },
        effects: [{ id: "e1", type: "barrier", amount: 5 }],
        limitations: [{ id: "l1", type: "usage_limit", period: "turn", max: 1 }],
      };

      // 1. Primer uso en Turno 1 -> ÉXITO
      const res1 = executeMechanicalBehavior({
        behavior: perTurnBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });
      expect(res1.success).toBe(true);
      encounter = res1.newEncounter;

      // 2. Segundo uso en Turno 1 -> BLOQUEADO
      const res2 = executeMechanicalBehavior({
        behavior: perTurnBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });
      expect(res2.success).toBe(false);

      // 3. Avanzar a Turno 2 -> El contador por turno se resetea, disponible de nuevo
      encounter = advanceTurn(encounter, {}, world);
      const res3 = executeMechanicalBehavior({
        behavior: perTurnBehavior,
        sourceEntityId: "hero",
        world,
        encounter,
      });
      expect(res3.success).toBe(true);
    });
  });
});

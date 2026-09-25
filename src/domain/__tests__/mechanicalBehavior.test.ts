import { describe, it, expect } from "vitest";
import {
  mechanicalBehaviorSchema,
  mechanicalBehaviorsSchema,
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from "../mechanicalBehavior.ts";

describe("MechanicalBehavior Domain Model", () => {
  it("crea comportamiento active", () => {
    const activeBehavior = createDefaultMechanicalBehavior("bh_active_1", "active", "Ataque Rápido");
    activeBehavior.activation = {
      actionType: "action",
      timing: "immediate",
      turns: 0,
      description: "Activación inmediata estándar",
    };
    activeBehavior.effects = [
      {
        id: "eff_1",
        type: "damage",
        dice: "2D8",
        damageType: "impact",
      },
    ];

    const parsed = mechanicalBehaviorSchema.parse(activeBehavior);
    expect(parsed.mode).toBe("active");
    expect(parsed.activation?.actionType).toBe("action");
    expect(parsed.effects[0].type).toBe("damage");
  });

  it("crea comportamiento reactive", () => {
    const reactiveBehavior = createDefaultMechanicalBehavior("bh_react_1", "reactive", "Contragolpe");
    reactiveBehavior.trigger = {
      kind: "receive_damage",
      description: "Cuando recibes daño físico",
      parameters: { minDamage: 1 },
    };
    reactiveBehavior.effects = [
      {
        id: "eff_2",
        type: "damage",
        dice: "1D6",
      },
    ];

    const parsed = mechanicalBehaviorSchema.parse(reactiveBehavior);
    expect(parsed.mode).toBe("reactive");
    expect(parsed.trigger?.kind).toBe("receive_damage");
  });

  it("crea comportamiento continuous", () => {
    const continuousBehavior = createDefaultMechanicalBehavior("bh_cont_1", "continuous", "Aura Pasiva");
    continuousBehavior.temporality = {
      duration: { type: "while_condition", conditionDescription: "Mientras esté consciente" },
    };
    continuousBehavior.effects = [
      {
        id: "eff_3",
        type: "barrier",
        amount: 5,
      },
    ];

    const parsed = mechanicalBehaviorSchema.parse(continuousBehavior);
    expect(parsed.mode).toBe("continuous");
    expect(parsed.activation).toBeUndefined();
    expect(parsed.trigger).toBeUndefined();
  });

  it("normaliza tipos de duración numéricos y 'sustained' correctamente", () => {
    const b1 = createDefaultMechanicalBehavior("bh_dur_1", "active");
    b1.temporality = { duration: { type: "1" as any } };
    const p1 = mechanicalBehaviorSchema.parse(b1);
    expect(p1.temporality?.duration?.type).toBe("turns");
    expect(p1.temporality?.duration?.turns).toBe(1);

    const b2 = createDefaultMechanicalBehavior("bh_dur_2", "active");
    b2.temporality = { duration: { type: "sustained" as any } };
    const p2 = mechanicalBehaviorSchema.parse(b2);
    expect(p2.temporality?.duration?.type).toBe("until_deactivated");
  });

  it("elemento con múltiples comportamientos", () => {
    const behaviors: MechanicalBehavior[] = [
      createDefaultMechanicalBehavior("bh_1", "active", "Modo Ofensivo"),
      createDefaultMechanicalBehavior("bh_2", "reactive", "Escudo Reactivo"),
      createDefaultMechanicalBehavior("bh_3", "continuous", "Presencia Imponente"),
    ];

    const parsed = mechanicalBehaviorsSchema.parse(behaviors);
    expect(parsed).toHaveLength(3);
    expect(parsed.map(b => b.mode)).toEqual(["active", "reactive", "continuous"]);
  });

  it("comportamiento con múltiples efectos", () => {
    const behavior: MechanicalBehavior = {
      id: "bh_multi",
      name: "Explosión Drenadora",
      mode: "active",
      activation: { actionType: "action", timing: "immediate", turns: 0, description: "" },
      conditions: [],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        { id: "eff_dmg", type: "damage", dice: "3D6" },
        { id: "eff_heal", type: "healing", resourceId: "SA", amount: 4 },
        { id: "eff_status", type: "status_apply", statusElementId: "status_blind", turns: 2 },
      ],
      target: { type: "enemy" },
      temporality: { duration: { type: "instant" } },
      limitations: [],
    };

    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.effects).toHaveLength(3);
    expect(parsed.effects[0].type).toBe("damage");
    expect(parsed.effects[1].type).toBe("healing");
    expect(parsed.effects[2].type).toBe("status_apply");
  });
});

describe("MechanicalBehavior Structural Details", () => {
  it("condición manual", () => {
    const behavior = createDefaultMechanicalBehavior("b1", "continuous");
    behavior.conditions = [
      {
        type: "manual",
        signalId: "master_narrative_permission",
        description: "Aprobado por el Master según terreno",
      },
    ];
    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.conditions[0].type).toBe("manual");
  });

  it("condición por recurso", () => {
    const behavior = createDefaultMechanicalBehavior("b2", "continuous");
    behavior.conditions = [
      {
        type: "resource",
        resourceId: "ES",
        comparison: "<=",
        value: 3,
      },
    ];
    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.conditions[0].type).toBe("resource");
    if (parsed.conditions[0].type === "resource") {
      expect(parsed.conditions[0].comparison).toBe("<=");
      expect(parsed.conditions[0].value).toBe(3);
    }
  });

  it("trigger de transición de umbral", () => {
    const behavior = createDefaultMechanicalBehavior("b3", "reactive");
    behavior.trigger = {
      kind: "resource_threshold_crossed",
      resourceId: "ES",
      threshold: 3,
      direction: "cross_down",
      description: "Cuando la ES cae a 3 o menos",
    };
    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.trigger?.kind).toBe("resource_threshold_crossed");
    expect(parsed.trigger?.direction).toBe("cross_down");
  });

  it("modificador multiply", () => {
    const behavior = createDefaultMechanicalBehavior("b4", "reactive");
    behavior.effects = [
      {
        id: "eff_mult",
        type: "cost_modifier",
        scopeId: "quirk",
        amount: 2,
        operation: "multiply",
      },
    ];
    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.effects[0].type).toBe("cost_modifier");
    if (parsed.effects[0].type === "cost_modifier") {
      expect(parsed.effects[0].operation).toBe("multiply");
      expect(parsed.effects[0].amount).toBe(2);
    }
  });

  it("target con rango y área", () => {
    const behavior = createDefaultMechanicalBehavior("b5", "active");
    behavior.target = {
      type: "area",
      quantity: { mode: "all" },
      range: { type: "distance", distanceMeters: 20 },
      area: { shape: "radius", sizeMeters: 5 },
      selectionRestriction: "nearest",
    };
    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.target?.range?.distanceMeters).toBe(20);
    expect(parsed.target?.area?.shape).toBe("radius");
    expect(parsed.target?.area?.sizeMeters).toBe(5);
    expect(parsed.target?.selectionRestriction).toBe("nearest");
  });

  it("duration until_next_roll y until_next_use", () => {
    const bRoll = createDefaultMechanicalBehavior("b_roll", "reactive");
    bRoll.temporality = { duration: { type: "until_next_roll" } };
    expect(mechanicalBehaviorSchema.parse(bRoll).temporality?.duration.type).toBe("until_next_roll");

    const bUse = createDefaultMechanicalBehavior("b_use", "reactive");
    bUse.temporality = { duration: { type: "until_next_use" } };
    expect(mechanicalBehaviorSchema.parse(bUse).temporality?.duration.type).toBe("until_next_use");
  });

  it("item requirement por tag y item mode reserve", () => {
    const behavior = createDefaultMechanicalBehavior("b_item", "active");
    behavior.limitations = [
      {
        id: "lim_tag",
        type: "item_requirement",
        referenceType: "tag",
        referenceValue: "arma_filo",
        quantity: 1,
        mode: "reserve",
      },
    ];
    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.limitations[0].type).toBe("item_requirement");
    if (parsed.limitations[0].type === "item_requirement") {
      expect(parsed.limitations[0].referenceType).toBe("tag");
      expect(parsed.limitations[0].mode).toBe("reserve");
    }
  });

  it("control con counter/reset", () => {
    const behavior = createDefaultMechanicalBehavior("b_ctrl", "reactive");
    behavior.control = {
      counter: {
        id: "impact_counter",
        name: "Impacto",
        initialValue: 0,
        incrementOnTrigger: 1,
        cap: 3,
        resetCondition: "when_triggered",
      },
      accumulation: {
        accumulateBy: "damage_taken",
        threshold: 3,
        resetOnThreshold: true,
      },
      reset: {
        event: "turn_end",
        target: "counter",
      },
    };
    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.control?.counter?.name).toBe("Impacto");
    expect(parsed.control?.counter?.cap).toBe(3);
    expect(parsed.control?.counter?.resetCondition).toBe("when_triggered");
  });

  it("excepción pagando recurso", () => {
    const behavior = createDefaultMechanicalBehavior("b_exc", "active");
    behavior.control = {
      exception: {
        description: "Puede ignorar el requisito de condición pagando 4 ES",
        allowWhenRequirementFailed: true,
        costResource: "ES",
        costAmount: 4,
        action: "allow",
      },
    };
    const parsed = mechanicalBehaviorSchema.parse(behavior);
    expect(parsed.control?.exception?.allowWhenRequirementFailed).toBe(true);
    expect(parsed.control?.exception?.costResource).toBe("ES");
    expect(parsed.control?.exception?.costAmount).toBe(4);
  });
});

describe("Fixtures de Validación (Casos de Aceptación Serializables)", () => {
  it("Fixture 1: Retroceso Corporal", () => {
    // Reactive, Trigger: use_quirk, Effect: damage 3, target self
    const retrocesoCorporal: MechanicalBehavior = {
      id: "bh_retroceso_corporal",
      name: "Retroceso Corporal",
      mode: "reactive",
      trigger: {
        kind: "use_quirk",
        description: "Cada vez que se activa el Quirk",
      },
      conditions: [],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_recoil_dmg",
          type: "damage",
          dice: "3",
          damageType: "recoil",
        },
      ],
      target: {
        type: "self",
      },
      temporality: {
        duration: { type: "instant" },
      },
      limitations: [],
    };

    const serialized = JSON.stringify(retrocesoCorporal);
    const deserialized = mechanicalBehaviorSchema.parse(JSON.parse(serialized));
    expect(deserialized.mode).toBe("reactive");
    expect(deserialized.trigger?.kind).toBe("use_quirk");
    expect(deserialized.effects[0].type).toBe("damage");
    expect(deserialized.target?.type).toBe("self");
  });

  it("Fixture 2: Punto de Quiebre", () => {
    // Continuous, Condition: SA <= 50%, Effect: roll penalty -2, Target: action rolls, Duration: while_condition
    const puntoDeQuiebre: MechanicalBehavior = {
      id: "bh_punto_quiebre",
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
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_roll_penalty",
          type: "roll_modifier",
          rollType: "action",
          amount: -2,
          operation: "add",
        },
      ],
      target: {
        type: "roll",
        description: "Tiradas de acción",
      },
      temporality: {
        duration: {
          type: "while_condition",
          conditionDescription: "Mientras la Salud esté en 50% o menos",
        },
      },
      limitations: [],
    };

    const serialized = JSON.stringify(puntoDeQuiebre);
    const deserialized = mechanicalBehaviorSchema.parse(JSON.parse(serialized));
    expect(deserialized.mode).toBe("continuous");
    expect(deserialized.conditions[0].type).toBe("percentage");
    expect(deserialized.temporality?.duration.type).toBe("while_condition");
    expect(deserialized.effects[0].type).toBe("roll_modifier");
  });

  it("Fixture 3: Vulnerable al fuego", () => {
    // Reactive, Trigger: receive_damage, Condition: source tag = fire, Effect: incoming_damage_modifier +4
    const vulnerableAlFuego: MechanicalBehavior = {
      id: "bh_vulnerable_fuego",
      name: "Vulnerable al Fuego",
      mode: "reactive",
      trigger: {
        kind: "receive_damage",
        description: "Al recibir un ataque con daño",
      },
      conditions: [
        {
          type: "tag",
          tag: "fire",
          scope: "attack",
        },
      ],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_vuln_fire",
          type: "incoming_damage_modifier",
          amount: 4,
          operation: "add",
          tagFilter: "fire",
        },
      ],
      target: {
        type: "self",
      },
      temporality: {
        duration: { type: "instant" },
      },
      limitations: [],
    };

    const serialized = JSON.stringify(vulnerableAlFuego);
    const deserialized = mechanicalBehaviorSchema.parse(JSON.parse(serialized));
    expect(deserialized.mode).toBe("reactive");
    expect(deserialized.trigger?.kind).toBe("receive_damage");
    expect(deserialized.conditions[0].type).toBe("tag");
    expect(deserialized.effects[0].type).toBe("incoming_damage_modifier");
  });

  it("Fixture 4: Sobrecarga Total con overrides por efecto", () => {
    // Reactive, Trigger: quirk roll, Condition: both dice = 10
    // Effect 1: damage 4 -> self, instant
    // Effect 2: cost modifier multiply 2 -> until_next_use
    const sobrecargaTotal: MechanicalBehavior = {
      id: "bh_sobrecarga_total",
      name: "Sobrecarga Total",
      mode: "reactive",
      trigger: {
        kind: "roll",
        description: "Tirada de Quirk",
      },
      conditions: [
        {
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
          id: "eff_self_dmg",
          type: "damage",
          dice: "4",
          damageType: "overcharge",
          target: { type: "self" },
          temporality: { duration: { type: "instant" } },
        },
        {
          id: "eff_cost_double",
          type: "cost_modifier",
          scopeId: "quirk",
          amount: 2,
          operation: "multiply",
          temporality: { duration: { type: "until_next_use" } },
        },
      ],
      target: {
        type: "self",
      },
      temporality: {
        duration: { type: "instant" },
      },
      limitations: [],
    };

    const serialized = JSON.stringify(sobrecargaTotal);
    const deserialized = mechanicalBehaviorSchema.parse(JSON.parse(serialized));
    expect(deserialized.mode).toBe("reactive");
    expect(deserialized.effects).toHaveLength(2);
    expect(deserialized.effects[0].type).toBe("damage");
    expect(deserialized.effects[0].target?.type).toBe("self");
    expect(deserialized.effects[0].temporality?.duration.type).toBe("instant");
    expect(deserialized.effects[1].type).toBe("cost_modifier");
    if (deserialized.effects[1].type === "cost_modifier") {
      expect(deserialized.effects[1].operation).toBe("multiply");
      expect(deserialized.effects[1].amount).toBe(2);
      expect(deserialized.effects[1].temporality?.duration.type).toBe("until_next_use");
    }
  });

  it("Fixture 5 (Fase 1.5): Trauma con efectos estructurados por rama de resolución", () => {
    // Trauma: Resolution RD 16
    // Failure -> status_apply Paralizado 1 turno
    // Failure margin >= 5 -> status_apply Paralizado 2 turnos
    const trauma: MechanicalBehavior = {
      id: "bh_trauma",
      name: "Trauma Psíquico",
      mode: "active",
      activation: { actionType: "action", timing: "immediate", turns: 0, description: "" },
      conditions: [],
      conditionLogic: "all",
      resolution: {
        type: "rd",
        difficulty: 16,
        attribute: "VOL",
        outcomes: [
          {
            id: "out_success",
            outcome: "success",
            description: "Resiste el trauma sin consecuencias",
            effects: [],
          },
          {
            id: "out_fail",
            outcome: "failure",
            description: "Falla la tirada y queda paralizado 1 turno",
            effects: [
              {
                id: "eff_paralysis_1",
                type: "status_apply",
                statusElementId: "status_paralizado",
                turns: 1,
              },
            ],
          },
          {
            id: "out_margin",
            outcome: "failure_margin",
            marginThreshold: 5,
            description: "Falla por 5 o más: trauma severo",
            effects: [
              {
                id: "eff_paralysis_2",
                type: "status_apply",
                statusElementId: "status_paralizado",
                turns: 2,
              },
            ],
          },
        ],
      },
      effects: [],
      target: { type: "enemy" },
      temporality: { duration: { type: "instant" } },
      limitations: [],
    };

    const serialized = JSON.stringify(trauma);
    const deserialized = mechanicalBehaviorSchema.parse(JSON.parse(serialized));
    expect(deserialized.resolution?.type).toBe("rd");
    expect(deserialized.resolution?.difficulty).toBe(16);
    expect(deserialized.resolution?.outcomes).toHaveLength(3);

    const failOutcome = deserialized.resolution?.outcomes?.find(o => o.outcome === "failure");
    expect(failOutcome).toBeDefined();
    expect(failOutcome?.effects).toHaveLength(1);
    expect(failOutcome?.effects[0].type).toBe("status_apply");
    if (failOutcome?.effects[0].type === "status_apply") {
      expect(failOutcome.effects[0].turns).toBe(1);
      expect(failOutcome.effects[0].statusElementId).toBe("status_paralizado");
    }

    const marginOutcome = deserialized.resolution?.outcomes?.find(o => o.outcome === "failure_margin");
    expect(marginOutcome).toBeDefined();
    expect(marginOutcome?.marginThreshold).toBe(5);
    expect(marginOutcome?.effects).toHaveLength(1);
    if (marginOutcome?.effects[0].type === "status_apply") {
      expect(marginOutcome.effects[0].turns).toBe(2);
      expect(marginOutcome.effects[0].statusElementId).toBe("status_paralizado");
    }
  });

  it("Fixture 6 (Fase 1.5): Sobrecarga Progresiva con acumulador, cap y reset condicional", () => {
    // Counter cap: 3, increments on use_quirk, reset when rested
    const sobrecargaProgresiva: MechanicalBehavior = {
      id: "bh_sobrecarga_progresiva",
      name: "Sobrecarga Progresiva",
      mode: "reactive",
      trigger: {
        kind: "use_quirk",
        description: "Cada uso del Quirk incrementa el sobrecalentamiento",
      },
      conditions: [],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_overheat_penalty",
          type: "turn_loss",
          turns: 1,
        },
      ],
      target: { type: "self" },
      temporality: { duration: { type: "instant" } },
      limitations: [],
      control: {
        counter: {
          id: "cnt_heat",
          name: "Calor Residual",
          initialValue: 0,
          incrementOnTrigger: 1,
          cap: 3,
          resetCondition: "condition",
          resetConditionRule: {
            id: "cond_rested",
            type: "manual",
            signalId: "descanso_completo",
            description: "Tras haber realizado un descanso completo",
          },
        },
        accumulation: {
          accumulateBy: "trigger_count",
          threshold: 3,
          resetOnThreshold: true,
        },
      },
    };

    const serialized = JSON.stringify(sobrecargaProgresiva);
    const deserialized = mechanicalBehaviorSchema.parse(JSON.parse(serialized));
    expect(deserialized.control?.counter?.name).toBe("Calor Residual");
    expect(deserialized.control?.counter?.cap).toBe(3);
    expect(deserialized.control?.counter?.resetCondition).toBe("condition");
    expect(deserialized.control?.counter?.resetConditionRule?.type).toBe("manual");
    if (deserialized.control?.counter?.resetConditionRule?.type === "manual") {
      expect(deserialized.control.counter.resetConditionRule.signalId).toBe("descanso_completo");
    }
    expect(deserialized.control?.accumulation?.threshold).toBe(3);
  });

  it("Fixture 7 (Fase 1.5): Dependencia con control de excepción y coste alternativo", () => {
    // Requires active state or substance; exception allows acting by paying 4 ES
    const dependencia: MechanicalBehavior = {
      id: "bh_dependencia",
      name: "Dependencia Química",
      mode: "continuous",
      conditions: [
        {
          id: "cond_dosis",
          type: "status",
          statusElementId: "dosis_activa",
          present: true,
        },
      ],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_buff_potencia",
          type: "bonus",
          targetStat: "FUE",
          amount: 2,
          operation: "add",
        },
      ],
      target: { type: "self" },
      temporality: { duration: { type: "while_condition" } },
      limitations: [],
      control: {
        exception: {
          id: "exc_dependencia",
          description: "Ignorar la falta de dosis pagando 4 ES de sobreesfuerzo",
          allowWhenRequirementFailed: true,
          targetBehaviorId: "bh_dependencia",
          failedConditionId: "cond_dosis",
          costResource: "ES",
          costAmount: 4,
          action: "allow",
        },
      },
    };

    const serialized = JSON.stringify(dependencia);
    const deserialized = mechanicalBehaviorSchema.parse(JSON.parse(serialized));
    expect(deserialized.conditions).toHaveLength(1);
    expect(deserialized.control?.exception?.allowWhenRequirementFailed).toBe(true);
    expect(deserialized.control?.exception?.targetBehaviorId).toBe("bh_dependencia");
    expect(deserialized.control?.exception?.failedConditionId).toBe("cond_dosis");
    expect(deserialized.control?.exception?.costResource).toBe("ES");
    expect(deserialized.control?.exception?.costAmount).toBe(4);
  });

  it("Lógica booleana de condiciones: AND, OR y negación (negated: true)", () => {
    const behaviorWithNegation: MechanicalBehavior = {
      id: "bh_not_cond",
      name: "Miedo a la Luz",
      mode: "continuous",
      conditions: [
        {
          id: "c_light",
          type: "tag",
          tag: "illuminated",
          scope: "any",
          negated: true,
        },
      ],
      conditionLogic: "all",
      resolution: { type: "automatic", outcomes: [] },
      effects: [
        {
          id: "eff_fear_penalty",
          type: "roll_modifier",
          rollType: "action",
          amount: -3,
          operation: "add",
        },
      ],
      target: { type: "self" },
      temporality: { duration: { type: "while_condition" } },
      limitations: [],
    };

    const parsed = mechanicalBehaviorSchema.parse(behaviorWithNegation);
    expect(parsed.conditionLogic).toBe("all");
    expect(parsed.conditions[0].negated).toBe(true);
  });
});

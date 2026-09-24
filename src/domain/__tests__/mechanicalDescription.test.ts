import { describe, it, expect } from "vitest";
import {
  describeMechanicalBehavior,
  describeMechanicalEffect,
  describeMechanicalTarget,
  describeMechanicalCondition,
  describeMechanicalLimitation,
  describeMechanicalTrigger,
  describeMechanicalTemporality,
  describeTargetRange,
  describeTargetArea,
} from "../mechanicalDescription";
import {
  MechanicalBehavior,
  createDefaultMechanicalBehavior,
} from "../mechanicalBehavior";
import { SYSTEM_TRAITS } from "../systemTraits";
import { SYSTEM_WEAKNESSES } from "../systemWeaknesses";

describe("Mechanical Description Renderer (Task 23)", () => {
  // A. Damage 3D6
  it("A: renders damage dice correctly", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_dmg"),
      effects: [{ id: "eff1", type: "damage", dice: "3D6" }],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toBe("Inflige 3D6 de daño.");
    expect(res.complete).toBe(true);
    expect(res.warnings).toHaveLength(0);
  });

  // B. Healing SA 4
  it("B: renders healing Salud correctly", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_heal_sa"),
      effects: [{ id: "eff1", type: "healing", resourceId: "SA", amount: 4 }],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toContain("Recupera 4 de Salud.");
    expect(res.complete).toBe(true);
  });

  // C. Healing ES 2
  it("C: renders healing Estamina correctly", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_heal_es"),
      effects: [{ id: "eff1", type: "healing", resourceId: "ES", amount: 2 }],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toContain("Recupera 2 de Estamina.");
    expect(res.complete).toBe(true);
  });

  // D. Barrier 10
  it("D: renders barrier correctly", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_bar"),
      effects: [{ id: "eff1", type: "barrier", amount: 10 }],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toBe("Otorga 10 puntos de Barrera.");
    expect(res.complete).toBe(true);
  });

  // E. FUE +1 attribute modifier
  it("E: renders attribute modifier correctly", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_attr"),
      effects: [
        {
          id: "eff1",
          type: "attribute_modifier",
          attributeId: "fue",
          amount: 1,
          operation: "add",
        },
      ],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toContain("+1 a Fuerza");
    expect(res.complete).toBe(true);
  });

  // F. Aturdido + 1 turn
  it("F: renders status application and duration correctly", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_status"),
      effects: [
        {
          id: "eff1",
          type: "status_apply",
          statusElementId: "core.status.stunned",
          turns: 1,
        },
      ],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toBe("Aplica Aturdido durante 1 turno.");
    expect(res.complete).toBe(true);
  });

  // G. usage_limit combat max 1
  it("G: renders usage limit correctly", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_lim"),
      effects: [{ id: "eff1", type: "barrier", amount: 5 }],
      limitations: [
        { id: "lim1", type: "usage_limit", period: "combat", max: 1 },
      ],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toContain("1 vez por combate.");
    expect(res.complete).toBe(true);
  });

  // H. ally up_to 3
  it("H: renders target quantity 'up_to 3' correctly", () => {
    const tRes = describeMechanicalTarget({
      type: "ally",
      quantity: { mode: "up_to", count: 3 },
    });
    expect(tRes.text).toBe("Hasta 3 aliados");
    expect(tRes.complete).toBe(true);
  });

  // I. Líder nato compact description
  it("I: renders Líder nato compact description without hardcoding", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("natural-leader.speech"),
      target: { type: "ally", quantity: { mode: "up_to", count: 3 } },
      effects: [{ id: "eff1", type: "healing", resourceId: "ES", amount: 2 }],
      limitations: [{ id: "lim1", type: "usage_limit", period: "combat", max: 1 }],
    };
    const res = describeMechanicalBehavior(mb, { format: "compact" });

    expect(res.complete).toBe(true);
    expect(res.warnings).toHaveLength(0);
    expect(res.text).toBe(
      "Hasta 3 aliados recuperan 2 de Estamina. 1 vez por combate."
    );
  });

  // J. Líder nato detailed description
  it("J: renders Líder nato detailed format exposing all structured sections", () => {
    const naturalLeader = SYSTEM_TRAITS.find(
      (t) => t.id === "core.trait.natural-leader"
    );
    const behavior = naturalLeader!.mechanicalBehaviors[0];
    const res = describeMechanicalBehavior(behavior, { format: "detailed" });

    expect(res.complete).toBe(true);
    expect(res.sections?.activation).toContain("Dar un discurso.");
    expect(res.sections?.target).toContain("Hasta 3 aliados");
    expect(res.sections?.effects?.[0]).toContain("recuperan 2 de Estamina");
    expect(res.sections?.limitations).toContain("1 vez por combate");
    expect(res.text).toContain("Activación: Dar un discurso.");
    expect(res.text).toContain("Objetivo: Hasta 3 aliados.");
    expect(res.text).toContain("Limitaciones: 1 vez por combate.");
  });

  // K. Reflejos Rápidos
  it("K: renders Reflejos Rápidos from its structured behavior data", () => {
    const quickReflexes = SYSTEM_TRAITS.find(
      (t) => t.id === "core.trait.quick-reflexes"
    );
    expect(quickReflexes).toBeDefined();

    const behavior = quickReflexes!.mechanicalBehaviors[0];
    const res = describeMechanicalBehavior(behavior, { format: "compact" });

    expect(res.complete).toBe(true);
    expect(res.text).toContain("Otorga +2 a Iniciativa.");
    expect(res.text).toContain("Solo durante el primer turno del combate.");
  });

  // L. Mala Cara
  it("L: renders Mala Cara canonical behaviors from its structured data", () => {
    const malaCara = SYSTEM_WEAKNESSES.find(
      (w) => w.id === "weakness_mala_cara"
    );
    expect(malaCara).toBeDefined();

    const passiveBehavior = malaCara!.mechanicalBehaviors[0];
    const passiveRes = describeMechanicalBehavior(passiveBehavior);
    expect(passiveRes.complete).toBe(true);
    expect(passiveRes.text).toContain("+4 a la dificultad (RD) de tiradas de carisma");
    expect(passiveRes.text).toContain("+4 a la dificultad (RD) de tiradas de presencia");

    const reactiveBehavior = malaCara!.mechanicalBehaviors[1];
    const reactiveRes = describeMechanicalBehavior(reactiveBehavior, {
      format: "detailed",
    });
    expect(reactiveRes.complete).toBe(true);
    expect(reactiveRes.sections?.trigger?.[0]).toBe("Al recibir soporte");
    expect(reactiveRes.sections?.resolution?.[0]).toBe("Superar RD 12");
  });

  // M. Manual effect uses message
  it("M: renders manual effect using its explicit message", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_manual_eff"),
      effects: [
        {
          id: "eff1",
          type: "manual",
          message: "El objetivo no puede mentir durante la escena.",
        },
      ],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toBe("El objetivo no puede mentir durante la escena.");
    expect(res.complete).toBe(true);
  });

  // N. Manual condition with description
  it("N: renders manual condition using explicit description", () => {
    const condRes = describeMechanicalCondition({
      type: "manual",
      signalId: "full_moon",
      description: "Solo durante noche de luna llena.",
    });
    expect(condRes.text).toBe("Solo durante noche de luna llena.");
    expect(condRes.complete).toBe(true);
  });

  // O. Manual condition without description produces complete=false and warnings
  it("O: marks manual condition without description as incomplete with warnings", () => {
    const condRes = describeMechanicalCondition({
      type: "manual",
      signalId: "unknown_custom_signal",
    });
    expect(condRes.complete).toBe(false);
    expect(condRes.warnings.length).toBeGreaterThan(0);
    expect(condRes.warnings[0]).toContain("lacks explicit description");
  });

  // P. Multiple effects (no silent dropping)
  it("P: renders multiple effects together without dropping any", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_multi_eff"),
      effects: [
        { id: "eff1", type: "damage", dice: "2D8" },
        { id: "eff2", type: "barrier", amount: 4 },
        { id: "eff3", type: "status_apply", statusElementId: "core.status.vulnerable", turns: 2 },
      ],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.text).toContain("Inflige 2D8 de daño.");
    expect(res.text).toContain("Otorga 4 puntos de Barrera.");
    expect(res.text).toContain("Aplica Vulnerable durante 2 turnos.");
    expect(res.sections?.effects).toHaveLength(3);
    expect(res.complete).toBe(true);
  });

  // Q. Distance range
  it("Q: renders distance range correctly", () => {
    const rRes = describeTargetRange({
      type: "distance",
      distanceMeters: 15,
    });
    expect(rRes.text).toBe("Alcance: 15 m");
    expect(rRes.complete).toBe(true);
  });

  // R. Radius area
  it("R: renders radius area shape correctly", () => {
    const aRes = describeTargetArea({
      shape: "radius",
      sizeMeters: 5,
    });
    expect(aRes.text).toBe("Área: Radio de 5 m");
    expect(aRes.complete).toBe(true);
  });

  // S. exact quantity: 1 ally vs 2 allies
  it("S: renders exact quantity correctly in singular vs plural", () => {
    const singleAlly = describeMechanicalTarget({
      type: "ally",
      quantity: { mode: "exact", count: 1 },
    });
    expect(singleAlly.text).toBe("1 aliado");

    const twoAllies = describeMechanicalTarget({
      type: "ally",
      quantity: { mode: "exact", count: 2 },
    });
    expect(twoAllies.text).toBe("2 aliados");

    const allEnemies = describeMechanicalTarget({
      type: "enemy",
      quantity: { mode: "all" },
    });
    expect(allEnemies.text).toBe("Todos los enemigos");
  });

  // T. usage limit: 1 vez vs 2 veces
  it("T: renders singular vs plural usage limits deterministically", () => {
    const once = describeMechanicalLimitation({
      id: "lim1",
      type: "usage_limit",
      period: "combat",
      max: 1,
    });
    expect(once.text).toBe("1 vez por combate");

    const twice = describeMechanicalLimitation({
      id: "lim2",
      type: "usage_limit",
      period: "turn",
      max: 2,
    });
    expect(twice.text).toBe("2 veces por turno");
  });

  // U. Unsupported/unrenderable mechanic produces complete=false and warning
  it("U: reports unsupported effect types with complete=false and clear warnings", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_unsupported"),
      effects: [
        {
          id: "eff_bad",
          type: "custom_unsupported_future_type",
        } as any,
      ],
    };
    const res = describeMechanicalBehavior(mb);
    expect(res.complete).toBe(false);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain("Unsupported effect type");
  });

  // V. compact vs detailed derive from the same data
  it("V: compact and detailed formats derive consistently from the same MechanicalBehavior", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_comp_det"),
      target: { type: "enemy", quantity: { mode: "exact", count: 1 } },
      effects: [{ id: "eff1", type: "damage", dice: "4D6" }],
      limitations: [{ id: "lim1", type: "cooldown", turns: 2 }],
    };

    const compactRes = describeMechanicalBehavior(mb, { format: "compact" });
    const detailedRes = describeMechanicalBehavior(mb, { format: "detailed" });

    expect(compactRes.complete).toBe(true);
    expect(detailedRes.complete).toBe(true);
    expect(compactRes.text).toContain("1 enemigo: Inflige 4D6 de daño. Tiempo de recarga: 2 turnos.");
    expect(detailedRes.text).toContain("Objetivo: 1 enemigo.");
    expect(detailedRes.text).toContain("Efectos: Inflige 4D6 de daño.");
    expect(detailedRes.text).toContain("Limitaciones: Tiempo de recarga: 2 turnos.");
  });

  // W. External stamina cost context
  it("W: renders optional external stamina cost context", () => {
    const mb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_cost"),
      effects: [{ id: "eff1", type: "damage", dice: "1D6" }],
    };
    const res = describeMechanicalBehavior(mb, {
      context: { staminaCost: 4 },
    });
    expect(res.text).toContain("Coste: 4 de Estamina.");
    expect(res.sections?.cost).toContain("Coste: 4 de Estamina");
  });

  // X. No mutation of the original MechanicalBehavior object
  it("X: guarantees pure execution without modifying input object", () => {
    const originalMb: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("test_immutability"),
      target: { type: "ally", quantity: { mode: "up_to", count: 3 } },
      effects: [{ id: "eff1", type: "healing", resourceId: "ES", amount: 2 }],
      limitations: [{ id: "lim1", type: "usage_limit", period: "combat", max: 1 }],
    };

    const snapshot = JSON.stringify(originalMb);
    describeMechanicalBehavior(originalMb, { format: "compact" });
    describeMechanicalBehavior(originalMb, { format: "detailed" });

    expect(JSON.stringify(originalMb)).toBe(snapshot);
  });

  // Task 24.2 Language Normalization Tests
  describe("Task 24.2 Normalizations", () => {
    it("renders reactive triggers with colon and lowercase effect action", () => {
      const mb: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("reactive_trigger_test"),
        mode: "reactive",
        trigger: { kind: "receive_damage" },
        effects: [
          {
            id: "eff1",
            type: "counter_modifier",
            counterId: "impacto",
            value: 1,
            operation: "increment",
          },
        ],
      };
      const res = describeMechanicalBehavior(mb);
      expect(res.text).toBe("Al recibir daño: incrementa en 1 el contador impacto.");
    });

    it("renders multiple conditions joined cleanly with 'y'", () => {
      const mb: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("multi_cond_test"),
        effects: [
          {
            id: "eff1",
            type: "derived_stat_modifier",
            statId: "eva",
            amount: -1,
            operation: "add",
          },
        ],
        conditionLogic: "all",
        conditions: [
          {
            id: "c1",
            type: "attribute",
            attributeId: "res",
            comparison: ">=",
            value: 5,
          },
          {
            id: "c2",
            type: "attribute",
            attributeId: "res",
            comparison: "<",
            value: 7,
          },
        ],
      };
      const res = describeMechanicalBehavior(mb);
      expect(res.text).toBe(
        "Otorga -1 a Evasión. Si Resistencia (RES) >= 5 y Resistencia (RES) < 7."
      );
    });

    it("renders generic tag wording with 'acción'", () => {
      const cond = describeMechanicalCondition({
        id: "c_tag",
        type: "tag",
        tag: "support",
        scope: "action",
      });
      expect(cond.text).toBe("Si la acción tiene la etiqueta Soporte");
    });

    it("renders action_interrupted and roll_failure triggers with clean Spanish", () => {
      const trig1 = describeMechanicalTrigger({ kind: "action_interrupted" });
      expect(trig1.text).toBe("Al interrumpirse la acción");

      const trig2 = describeMechanicalTrigger({
        kind: "roll_failure",
        elementId: "dominio_quirk",
      });
      expect(trig2.text).toBe("Al fallar una tirada de Dominio de Quirk");
    });

    it("renders roll modifiers with normalized scope labels", () => {
      const mb: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("roll_mod_scope"),
        effects: [
          {
            id: "eff1",
            type: "roll_modifier",
            amount: 1,
            operation: "add",
            rollType: "all",
          },
        ],
      };
      const res = describeMechanicalBehavior(mb);
      expect(res.text).toBe("Aplica +1 en tiradas de cualquier acción.");
    });

    it("prefixes manual condition with 'Condición:' when it doesn't start with a connector", () => {
      const cond1 = describeMechanicalCondition({
        id: "c_man1",
        type: "manual",
        signalId: "sig1",
        description: "Persona objeto de obsesión presente en la escena.",
      });
      expect(cond1.text).toBe("Condición: Persona objeto de obsesión presente en la escena.");

      const cond2 = describeMechanicalCondition({
        id: "c_man2",
        type: "manual",
        signalId: "sig2",
        description: "Solo durante el primer turno del combate.",
      });
      expect(cond2.text).toBe("Solo durante el primer turno del combate.");
    });
  });
});

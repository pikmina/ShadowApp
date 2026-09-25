import { describe, it, expect } from "vitest";
import {
  mechanicalEffectItemSchema,
  mechanicalBehaviorSchema,
  createDefaultMechanicalEffect,
  createDefaultMechanicalBehavior,
} from "../mechanicalBehavior";
import {
  calculateTechniqueStructuralCost,
  mechanicalEffectDefinitionSchema,
  mechanicalEffectSchema,
} from "../systemMechanics";
import { createCoreCategories } from "../coreRuleCatalog";
import { MECHANICAL_LABELS, getMechanicalLabel, getTransformationMagnitudeLabel } from "../mechanicalLabels";
import { describeMechanicalBehavior } from "../mechanicalDescription";
import {
  executeMechanicalBehavior,
  advanceTurn,
  createEncounterRuntimeState,
  hasActiveTransformation,
  getActiveTransformations,
  getOrCreateParticipantState,
  type RuleWorld,
} from "../mechanicalRuntime";

describe("Transformation Mechanical Effect System", () => {
  // 1. transformation es reconocido como MechanicalEffect / MechanicalEffectItem
  it("1. transformation is recognized as a valid MechanicalEffectItem", () => {
    const rawEffect = {
      id: "eff_tf_1",
      type: "transformation",
      magnitude: {
        type: "body",
        value: 1,
      },
    };

    const parsed = mechanicalEffectItemSchema.parse(rawEffect);
    expect(parsed.type).toBe("transformation");
    if (parsed.type === "transformation") {
      expect(parsed.magnitude?.type).toBe("body");
      expect(parsed.magnitude?.value).toBe(1);
    }

    // Also verify schema in systemMechanics
    const parsedDef = mechanicalEffectDefinitionSchema.parse({
      type: "transformation",
      timing: "on_activation",
      magnitude: { type: "body", value: 1 },
    });
    expect(parsedDef.type).toBe("transformation");

    const parsedCanonical = mechanicalEffectSchema.parse({
      id: "app_1",
      type: "transformation",
      timing: "on_activation",
      targeting: { allowedEntityKinds: ["character"], relationship: "self", selection: "direct", minTargets: 1, maxTargets: 1 },
      costRules: [],
      magnitude: { type: "body", value: 1 },
    });
    expect(parsedCanonical.type).toBe("transformation");
  });

  // 2. Puede crearse desde el factory/default del editor
  it("2. createDefaultMechanicalEffect creates a pristine transformation effect", () => {
    const effect = createDefaultMechanicalEffect("transformation", "custom_id_1");
    expect(effect.id).toBe("custom_id_1");
    expect(effect.type).toBe("transformation");
    if (effect.type === "transformation") {
      expect(effect.magnitude?.type).toBe("corporal");
      expect(effect.magnitude?.value).toBe(1);
    }
  });

  // 3. Puede serializarse e hidratarse correctamente
  it("3. serializes and hydrates correctly within a MechanicalBehavior", () => {
    const behavior = createDefaultMechanicalBehavior("bh_copycat", "active", "Copycat Behavior");
    behavior.activation = { actionType: "action", timing: "immediate", turns: 0, description: "" };
    behavior.target = { type: "self" };
    behavior.temporality = { duration: { type: "turns", turns: 5 } };
    behavior.resolution = { type: "rd", attribute: "RES", difficulty: 12 };
    behavior.limitations = [{ id: "lim_cd", type: "cooldown", turns: 2 }];
    behavior.conditions = [{ type: "manual", signalId: "Beber sangre del objetivo", negated: false, description: "" }];
    behavior.effects = [
      {
        id: "eff_trans_1",
        type: "transformation",
        magnitude: { type: "body", value: 1 },
        contextRef: "persona cuya sangre fue consumida",
      },
    ];

    const serialized = JSON.stringify(behavior);
    const parsed = JSON.parse(serialized);
    const hydrated = mechanicalBehaviorSchema.parse(parsed);

    expect(hydrated.effects[0].type).toBe("transformation");
    if (hydrated.effects[0].type === "transformation") {
      expect(hydrated.effects[0].magnitude?.type).toBe("body");
      expect(hydrated.effects[0].magnitude?.value).toBe(1);
      expect(hydrated.effects[0].contextRef).toBe("persona cuya sangre fue consumida");
    }
  });

  // 4 & 5. Duración de 5 turnos y expiración con el sistema temporal existente
  it("4 & 5. transformation lasts 5 turns in runtime and expires properly", () => {
    const behavior = createDefaultMechanicalBehavior("bh_transform_5t", "active", "Transformación 5 Turnos");
    behavior.activation = { actionType: "action", timing: "immediate", turns: 0, description: "" };
    behavior.target = { type: "self" };
    behavior.temporality = { duration: { type: "turns", turns: 5 } };
    behavior.effects = [
      {
        id: "eff_tf_5t",
        type: "transformation",
        magnitude: { type: "body", value: 1 },
      },
    ];

    const initialEncounter = createEncounterRuntimeState(1);
    getOrCreateParticipantState(initialEncounter, "hero1");
    getOrCreateParticipantState(initialEncounter, "villain1");

    const initialWorld: RuleWorld = {
      hero1: { id: "hero1", attributes: { FUE: 3, RES: 4, DES: 2, INT: 2, VEL: 3, VOL: 3 }, resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, statuses: [], inventory: {}, barrier: 0, modifiers: [] },
      villain1: { id: "villain1", attributes: { FUE: 2, RES: 2, DES: 2, INT: 2, VEL: 2, VOL: 2 }, resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, statuses: [], inventory: {}, barrier: 0, modifiers: [] },
    };

    // Execute at Turn 1
    const res = executeMechanicalBehavior({
      behavior,
      sourceEntityId: "hero1",
      encounter: initialEncounter,
      world: initialWorld,
    });

    expect(res.success).toBe(true);
    const heroState = res.newEncounter.participants.hero1;
    expect(hasActiveTransformation(heroState)).toBe(true);
    const activeList = getActiveTransformations(heroState);
    expect(activeList).toHaveLength(1);
    expect(activeList[0].remainingTurns).toBe(5);

    // Turn 1 -> Turn 2
    let nextState = advanceTurn(res.newEncounter);
    expect(hasActiveTransformation(nextState.participants.hero1)).toBe(true);
    expect(getActiveTransformations(nextState.participants.hero1)[0].remainingTurns).toBe(4);

    // Turn 2 -> Turn 3
    nextState = advanceTurn(nextState);
    expect(hasActiveTransformation(nextState.participants.hero1)).toBe(true);
    expect(getActiveTransformations(nextState.participants.hero1)[0].remainingTurns).toBe(3);

    // Turn 3 -> Turn 4
    nextState = advanceTurn(nextState);
    expect(hasActiveTransformation(nextState.participants.hero1)).toBe(true);
    expect(getActiveTransformations(nextState.participants.hero1)[0].remainingTurns).toBe(2);

    // Turn 4 -> Turn 5
    nextState = advanceTurn(nextState);
    expect(hasActiveTransformation(nextState.participants.hero1)).toBe(true);
    expect(getActiveTransformations(nextState.participants.hero1)[0].remainingTurns).toBe(1);

    // Turn 5 -> Turn 6 (Expires!)
    nextState = advanceTurn(nextState);
    expect(hasActiveTransformation(nextState.participants.hero1)).toBe(false);
    expect(getActiveTransformations(nextState.participants.hero1)).toHaveLength(0);
  });

  // 6. La magnitud Corporal = 1 continúa siendo valor estructural y no modifica atributos
  it("6. magnitude Corporal = 1 is purely structural and does NOT modify attributes", () => {
    const coreCats = createCoreCategories();
    const policy = {
      techniqueByLevel: [
        { level: 1, cost: 1 },
        { level: 2, cost: 2 },
      ],
    };

    const behaviorBody = createDefaultMechanicalBehavior("bh_body", "active", "Cuerpo");
    behaviorBody.effects = [
      {
        id: "eff_body",
        type: "transformation",
        magnitude: { type: "body", value: 1 },
      },
    ];

    const behavior2m = createDefaultMechanicalBehavior("bh_2m", "active", "2m");
    behavior2m.effects = [
      {
        id: "eff_2m",
        type: "transformation",
        magnitude: { type: "2m", value: 2 },
      },
    ];

    const behavior5m = createDefaultMechanicalBehavior("bh_5m", "active", "5m");
    behavior5m.effects = [
      {
        id: "eff_5m",
        type: "transformation",
        magnitude: { type: "5m", value: 3 },
      },
    ];

    const behavior10m = createDefaultMechanicalBehavior("bh_10m", "active", "10m");
    behavior10m.effects = [
      {
        id: "eff_10m",
        type: "transformation",
        magnitude: { type: "10m", value: 4 },
      },
    ];

    const behavior20m = createDefaultMechanicalBehavior("bh_20m", "active", "20m");
    behavior20m.effects = [
      {
        id: "eff_20m",
        type: "transformation",
        magnitude: { type: "20m", value: 6 },
      },
    ];

    // Verify structural cost values
    expect(calculateTechniqueStructuralCost([behaviorBody], coreCats, policy as any)).toBe(1);
    expect(calculateTechniqueStructuralCost([behavior2m], coreCats, policy as any)).toBe(2);
    expect(calculateTechniqueStructuralCost([behavior5m], coreCats, policy as any)).toBe(3);
    expect(calculateTechniqueStructuralCost([behavior10m], coreCats, policy as any)).toBe(4);
    expect(calculateTechniqueStructuralCost([behavior20m], coreCats, policy as any)).toBe(6);

    // Verify execution does NOT alter hero attributes
    const initialEncounter = createEncounterRuntimeState(1);
    getOrCreateParticipantState(initialEncounter, "hero1");

    const initialWorld: RuleWorld = {
      hero1: { id: "hero1", attributes: { FUE: 4, RES: 5, DES: 3, INT: 2, VEL: 3, VOL: 3 }, resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, statuses: [], inventory: {}, barrier: 0, modifiers: [] },
    };

    const res = executeMechanicalBehavior({
      behavior: behaviorBody,
      sourceEntityId: "hero1",
      encounter: initialEncounter,
      world: initialWorld,
    });

    const heroEntity = res.newWorld.hero1;
    expect(heroEntity.attributes.FUE).toBe(4);
    expect(heroEntity.attributes.RES).toBe(5);
    expect(heroEntity.attributes.DES).toBe(3);
  });

  // 7. El cooldown sigue siendo una limitación independiente del efecto
  it("7. cooldown is an independent limitation on the behavior", () => {
    const behavior = createDefaultMechanicalBehavior("bh_with_cd", "active", "Técnica con Cooldown");
    behavior.limitations = [{ id: "cd_2", type: "cooldown", turns: 2 }];
    behavior.effects = [
      {
        id: "eff_tf",
        type: "transformation",
        magnitude: { type: "corporal", value: 1 },
      },
    ];

    const initialEncounter = createEncounterRuntimeState(1);
    getOrCreateParticipantState(initialEncounter, "hero1");

    const initialWorld: RuleWorld = {
      hero1: { id: "hero1", attributes: { FUE: 3, RES: 3 }, resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, statuses: [], inventory: {}, barrier: 0, modifiers: [] },
    };

    const res = executeMechanicalBehavior({
      behavior,
      sourceEntityId: "hero1",
      encounter: initialEncounter,
      world: initialWorld,
    });

    // Cooldown is registered until Turn 1 + 2 + 1 = Turn 4
    expect(res.newEncounter.participants.hero1.cooldowns["bh_with_cd"]).toBe(4);
  });

  // 8. Labels y UI no exponen IDs técnicos
  it("8. Spanish labels are used properly and do not leak technical IDs", () => {
    expect(MECHANICAL_LABELS.effectTypes.transformation).toBe("Transformación");
    expect(getMechanicalLabel("effectTypes", "transformation")).toBe("Transformación");
    expect(getTransformationMagnitudeLabel("body")).toBe("Corporal");
    expect(getTransformationMagnitudeLabel("corporal")).toBe("Corporal");
    expect(getTransformationMagnitudeLabel("2m")).toBe("2 metros");
    expect(getTransformationMagnitudeLabel("5m")).toBe("5 metros");
    expect(getTransformationMagnitudeLabel("10m")).toBe("10 metros");
    expect(getTransformationMagnitudeLabel("20m")).toBe("20 metros");
  });

  // 9. Auto-generated description for Copycat
  it("9. auto-generated description formats transformation clearly", () => {
    const behavior = createDefaultMechanicalBehavior("RonDAr32", "active", "Comportamiento 1");
    behavior.activation = { actionType: "action", timing: "immediate", turns: 0, description: "" };
    behavior.conditions = [{ type: "manual", signalId: "Beber sangre del objetivo", negated: false, description: "" }];
    behavior.conditionLogic = "all";
    behavior.resolution = { type: "rd", attribute: "RES", difficulty: 12 };
    behavior.target = { type: "self" };
    behavior.temporality = { duration: { type: "turns", turns: 5 } };
    behavior.limitations = [{ id: "NxacP9", type: "cooldown", turns: 2 }];
    behavior.effects = [
      {
        id: "eff_copycat",
        type: "transformation",
        magnitude: { type: "corporal", value: 1 },
        contextRef: "persona cuya sangre fue consumida",
      },
    ];

    const desc = describeMechanicalBehavior(behavior);
    expect(desc.text).toContain("Transformación corporal");
    expect(desc.text).toContain("persona cuya sangre fue consumida");
    expect(desc.text).toContain("5 turnos");
    expect(desc.text).toContain("Tiempo de recarga: 2 turnos");
  });
});

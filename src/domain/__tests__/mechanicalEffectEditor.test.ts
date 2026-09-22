import { describe, it, expect } from "vitest";
import {
  createDefaultMechanicalEffect,
  type MechanicalEffectItem,
} from "../mechanicalBehavior";
import { getAttributeLabel, getMechanicalLabel } from "../mechanicalLabels";
import { SYSTEM_TRAITS } from "../systemTraits";

describe("Mechanical Effect Editor Logic & Hydration", () => {
  it("initializes correct default structures for all 13 effect types", () => {
    const types: MechanicalEffectItem["type"][] = [
      "damage",
      "healing",
      "barrier",
      "attribute_modifier",
      "cost_modifier",
      "incoming_damage_modifier",
      "outgoing_damage_modifier",
      "roll_modifier",
      "status_apply",
      "turn_loss",
      "action_block",
      "counter_modifier",
      "manual",
    ];

    types.forEach((type) => {
      const effect = createDefaultMechanicalEffect(type, "test_id");
      expect(effect.id).toBe("test_id");
      expect(effect.type).toBe(type);

      // Verify specific required fields per type
      const eff = effect as any;
      if (type === "damage") {
        expect(eff.dice).toBeDefined();
      } else if (type === "healing") {
        expect(eff.resourceId).toBeDefined();
        expect(eff.amount).toBeDefined();
      } else if (type === "barrier") {
        expect(eff.amount).toBeDefined();
      } else if (type === "attribute_modifier") {
        expect(eff.attributeId).toBeDefined();
        expect(eff.amount).toBeDefined();
      } else if (type === "cost_modifier") {
        expect(eff.scopeId).toBeDefined();
        expect(eff.amount).toBeDefined();
      } else if (type === "incoming_damage_modifier") {
        expect(eff.amount).toBeDefined();
      } else if (type === "outgoing_damage_modifier") {
        expect(eff.amount).toBeDefined();
      } else if (type === "roll_modifier") {
        expect(eff.rollType).toBeDefined();
        expect(eff.amount).toBeDefined();
      } else if (type === "status_apply") {
        expect(eff.statusElementId).toBeDefined();
      } else if (type === "turn_loss") {
        expect(eff.turns).toBeDefined();
      } else if (type === "action_block") {
        expect(eff.blockedAction).toBeDefined();
      } else if (type === "counter_modifier") {
        expect(eff.counterId).toBeDefined();
        expect(eff.value).toBeDefined();
      } else if (type === "manual") {
        expect(eff.message).toBeDefined();
      }
    });
  });

  it("hydrates Ágil's attribute_modifier effect accurately with VEL +1", () => {
    const agilTrait = SYSTEM_TRAITS.find((t) => t.name === "Ágil");
    expect(agilTrait).toBeDefined();

    const behavior = agilTrait?.mechanicalBehaviors?.[0];
    expect(behavior).toBeDefined();

    const effect = behavior?.effects?.[0];
    expect(effect).toBeDefined();
    expect(effect?.type).toBe("attribute_modifier");

    if (effect?.type === "attribute_modifier") {
      expect(effect.attributeId).toBe("vel");
      expect(effect.amount).toBe(1);
      expect(getAttributeLabel(effect.attributeId)).toBe("Velocidad (VEL)");
    }
  });

  it("atomically switches effect type while preserving effect ID and shared metadata", () => {
    const originalEffect: MechanicalEffectItem = {
      id: "eff_orig_123",
      type: "damage",
      dice: "2D6",
      target: { type: "enemy" },
      temporality: { duration: { type: "instant" } },
    };

    const newEffect = createDefaultMechanicalEffect(
      "attribute_modifier",
      originalEffect.id,
      originalEffect.target,
      originalEffect.temporality
    );

    expect(newEffect.id).toBe("eff_orig_123");
    expect(newEffect.type).toBe("attribute_modifier");
    expect(newEffect.target).toEqual({ type: "enemy" });
    expect(newEffect.temporality).toEqual({ duration: { type: "instant" } });
    if (newEffect.type === "attribute_modifier") {
      expect(newEffect.attributeId).toBe("fue");
      expect(newEffect.amount).toBe(1);
    }
  });

  it("returns Spanish labels for attribute modifier options", () => {
    expect(getAttributeLabel("vel")).toBe("Velocidad (VEL)");
    expect(getAttributeLabel("fue")).toBe("Fuerza (FUE)");
    expect(getMechanicalLabel("effectTypes", "attribute_modifier")).toBe("Modificar Atributo");
    expect(getMechanicalLabel("effectTypes", "outgoing_damage_modifier")).toBe("Modificar Daño Infligido");
  });
});

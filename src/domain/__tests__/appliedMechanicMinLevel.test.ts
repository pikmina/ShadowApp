import { describe, it, expect } from "vitest";
import { appliedMechanicReferenceSchema, resolveAppliedMechanics, type SystemMechanicsConfig } from "../systemMechanics";

describe("Applied Mechanics with minLevel", () => {
  it("validates appliedMechanicReferenceSchema with and without minLevel", () => {
    const validBase = appliedMechanicReferenceSchema.safeParse({
      applicationId: "app_1",
      mechanicId: "cat_1",
      ruleId: "rule_1",
    });
    expect(validBase.success).toBe(true);

    const validWithLevel = appliedMechanicReferenceSchema.safeParse({
      applicationId: "app_2",
      mechanicId: "cat_1",
      ruleId: "rule_1",
      minLevel: 3,
    });
    expect(validWithLevel.success).toBe(true);
    if (validWithLevel.success) {
      expect(validWithLevel.data.minLevel).toBe(3);
    }
  });

  it("resolves applied mechanics and separates duplicate checks by minLevel", () => {
    const categories: SystemMechanicsConfig = [
      {
        id: "combat_effects",
        name: "Efectos de Combate",
        description: "Reglas de combate",
        logicalType: "offensive",
        scope: { techniques: true, objects: true, actions: true },
        rules: [
          {
            id: "bonus_damage",
            name: "Daño Adicional",
            cost: 0,
            ruleType: "effect",
            effect: {
              type: "damage",
              timing: "passive",
              dice: "1d6",
            },
          },
        ],
      },
    ];

    const references = [
      { applicationId: "ref_1", mechanicId: "combat_effects", ruleId: "bonus_damage", minLevel: 1 },
      { applicationId: "ref_2", mechanicId: "combat_effects", ruleId: "bonus_damage", minLevel: 3 },
    ];

    const result = resolveAppliedMechanics(references, categories);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

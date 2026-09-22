import { describe, it, expect } from "vitest";
import {
  calculateTraitAttributeBonus,
  calculateDerivedStats,
} from "../../lib/characterValidation";

describe("Task 13: Trait and Weakness Effect Precedence (Legacy vs MechanicalBehavior)", () => {
  const mockStages = [
    { name: "Novato", baseHealth: 20, baseStamina: 10, maxAttr: 5, attrPoints: 20, baseDamage: "1D4" },
  ];

  it("Scenario A — MechanicalBehavior only: Ágil (mechanicalBehaviors -> VEL +1, effects = [])", () => {
    const agilElement = {
      id: "trait_agil_mb_only",
      name: "Ágil",
      kind: "trait",
      effects: [],
      mechanicalBehaviors: [
        {
          id: "bhv_agil",
          mode: "continuous",
          effects: [
            { id: "eff_vel_1", type: "attribute_modifier", attributeId: "vel", amount: 1 },
          ],
        },
      ],
    };

    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      traits: ["trait_agil_mb_only"],
    };

    const traitBonus = calculateTraitAttributeBonus(profile, [agilElement]);
    expect(traitBonus.byAttr.VEL).toBe(1);
    expect(traitBonus.total).toBe(1);

    const derived = calculateDerivedStats(profile, mockStages, [agilElement]);
    expect(derived.attributes.VEL).toBe(6);
    expect(derived.traitBonuses.VEL).toBe(1);
  });

  it("Scenario B — Legacy only: Ágil (mechanicalBehaviors = [], effects -> VEL +1)", () => {
    const legacyAgilElement = {
      id: "trait_agil_legacy_only",
      name: "Ágil",
      kind: "trait",
      effects: [
        { id: "leg_eff_vel_1", type: "attribute_modifier", attributeId: "vel", amount: 1 },
      ],
      mechanicalBehaviors: [],
    };

    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      traits: ["trait_agil_legacy_only"],
    };

    const traitBonus = calculateTraitAttributeBonus(profile, [legacyAgilElement]);
    expect(traitBonus.byAttr.VEL).toBe(1);
    expect(traitBonus.total).toBe(1);

    const derived = calculateDerivedStats(profile, mockStages, [legacyAgilElement]);
    expect(derived.attributes.VEL).toBe(6);
    expect(derived.traitBonuses.VEL).toBe(1);
  });

  it("Scenario C — Both contain the same effect: Ágil (mechanicalBehaviors -> VEL +1, legacy effects -> VEL +1)", () => {
    const duplicateAgilElement = {
      id: "trait_agil_duplicate",
      name: "Ágil",
      kind: "trait",
      effects: [
        { id: "leg_eff_vel_1", type: "attribute_modifier", attributeId: "vel", amount: 1 },
      ],
      mechanicalBehaviors: [
        {
          id: "bhv_agil",
          mode: "continuous",
          effects: [
            { id: "eff_vel_1", type: "attribute_modifier", attributeId: "vel", amount: 1 },
          ],
        },
      ],
    };

    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      traits: ["trait_agil_duplicate"],
    };

    const traitBonus = calculateTraitAttributeBonus(profile, [duplicateAgilElement]);
    expect(traitBonus.byAttr.VEL).toBe(1); // NOT 2!
    expect(traitBonus.total).toBe(1);

    const derived = calculateDerivedStats(profile, mockStages, [duplicateAgilElement]);
    expect(derived.attributes.VEL).toBe(6); // 5 base + 1 trait bonus, NOT 7!
    expect(derived.traitBonuses.VEL).toBe(1);
  });

  it("Scenario D — Derived stat duplicate: Salud Mejorada (mechanicalBehavior -> Salud +2, legacy effect -> Salud +2)", () => {
    const duplicateSaludElement = {
      id: "trait_salud_duplicate",
      name: "Salud Mejorada",
      kind: "trait",
      effects: [
        { id: "leg_eff_sal_1", type: "derived_stat_modifier", statId: "SAL", amount: 2 },
      ],
      mechanicalBehaviors: [
        {
          id: "bhv_salud",
          mode: "continuous",
          effects: [
            { id: "eff_sal_1", type: "derived_stat_modifier", statId: "SAL", amount: 2 },
          ],
        },
      ],
    };

    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      traits: ["trait_salud_duplicate"],
    };

    // Novato baseHealth = 20, RES = 2 -> base salud = 20 + 2 = 22.
    // With Salud +2 -> total salud should be 24, NOT 26!
    const derived = calculateDerivedStats(profile, mockStages, [duplicateSaludElement]);
    expect(derived.salud).toBe(24);
  });

  it("Scenario E — Trait + separate Trait: Two independent traits must still stack", () => {
    const traitA = {
      id: "trait_fue_a",
      name: "Fuerza Bruta",
      kind: "trait",
      effects: [],
      mechanicalBehaviors: [
        {
          id: "bhv_fue_a",
          mode: "continuous",
          effects: [
            { id: "eff_fue_a", type: "attribute_modifier", attributeId: "fue", amount: 1 },
          ],
        },
      ],
    };

    const traitB = {
      id: "trait_fue_b",
      name: "Entrenamiento Pesado",
      kind: "trait",
      effects: [],
      mechanicalBehaviors: [
        {
          id: "bhv_fue_b",
          mode: "continuous",
          effects: [
            { id: "eff_fue_b", type: "attribute_modifier", attributeId: "fue", amount: 1 },
          ],
        },
      ],
    };

    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      traits: ["trait_fue_a", "trait_fue_b"],
    };

    const traitBonus = calculateTraitAttributeBonus(profile, [traitA, traitB]);
    expect(traitBonus.byAttr.FUE).toBe(2);
    expect(traitBonus.total).toBe(2);

    const derived = calculateDerivedStats(profile, mockStages, [traitA, traitB]);
    expect(derived.attributes.FUE).toBe(5); // 3 base + 2 from independent traits
    expect(derived.traitBonuses.FUE).toBe(2);
  });

  it("Scenario F — Weakness compatibility: Legacy weakness fallback and duplicate protection", () => {
    // 1. Pure legacy weakness fallback
    const legacyWeakness = {
      id: "weakness_torpe_legacy",
      name: "Torpe",
      kind: "weakness",
      effects: [
        { id: "leg_wk_des", type: "attribute_modifier", attributeId: "des", amount: -1 },
      ],
      mechanicalBehaviors: [],
    };

    const profileLegacy = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      weaknesses: ["weakness_torpe_legacy"],
    };

    const traitBonusLegacy = calculateTraitAttributeBonus(profileLegacy, [legacyWeakness]);
    expect(traitBonusLegacy.byAttr.DES).toBe(-1);

    const derivedLegacy = calculateDerivedStats(profileLegacy, mockStages, [legacyWeakness]);
    expect(derivedLegacy.attributes.DES).toBe(1); // 2 base - 1 weakness

    // 2. Weakness with both legacy and mechanicalBehavior (must not double-subtract)
    const duplicateWeakness = {
      id: "weakness_torpe_duplicate",
      name: "Torpe",
      kind: "weakness",
      effects: [
        { id: "leg_wk_des", type: "attribute_modifier", attributeId: "des", amount: -1 },
      ],
      mechanicalBehaviors: [
        {
          id: "bhv_torpe",
          mode: "continuous",
          effects: [
            { id: "eff_wk_des", type: "attribute_modifier", attributeId: "des", amount: -1 },
          ],
        },
      ],
    };

    const profileDuplicate = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      weaknesses: ["weakness_torpe_duplicate"],
    };

    const traitBonusDup = calculateTraitAttributeBonus(profileDuplicate, [duplicateWeakness]);
    expect(traitBonusDup.byAttr.DES).toBe(-1); // NOT -2!

    const derivedDup = calculateDerivedStats(profileDuplicate, mockStages, [duplicateWeakness]);
    expect(derivedDup.attributes.DES).toBe(1); // 2 base - 1, NOT 0!
  });

  it("Scenario G — Referenced effects: Legitimate appliedMechanicReferenceSchema effects are preserved", () => {
    const passiveMechanics: any = [
      {
        id: "attr_boost",
        name: "Mejora Atributo",
        description: "Regla de atributo",
        scope: { techniques: true, objects: true, actions: false },
        targeting: { allowedEntityKinds: ["character"], relationship: "self", selection: "direct", minTargets: 1, maxTargets: 1 },
        rules: [
          {
            id: "rule_int_1",
            name: "+1 INT",
            cost: 0,
            ruleType: "effect",
            effect: { type: "attribute_modifier", attributeId: "INT", amount: 1, timing: "passive" },
          },
        ],
      },
    ];

    const referencedTrait = {
      id: "trait_referenced_int",
      name: "Erudito",
      kind: "trait",
      effects: [
        { applicationId: "app_int_1", mechanicId: "attr_boost", ruleId: "rule_int_1" },
      ],
      mechanicalBehaviors: [],
    };

    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      traits: ["trait_referenced_int"],
    };

    const traitBonus = calculateTraitAttributeBonus(profile, [referencedTrait], passiveMechanics);
    expect(traitBonus.byAttr.INT).toBe(1);
    expect(traitBonus.total).toBe(1);

    const derived = calculateDerivedStats(profile, mockStages, [referencedTrait], passiveMechanics);
    expect(derived.attributes.INT).toBe(6);
    expect(derived.traitBonuses.INT).toBe(1);
  });
});

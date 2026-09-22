import { describe, it, expect } from "vitest";
import { validateCharacter, calculateDerivedStats, calculateTraitAttributeBonus } from "../../lib/characterValidation";

describe("Task 8: Attribute Point Budget Accounting & Validation", () => {
  const mockStages = [
    { name: "Novato", baseHealth: 20, baseStamina: 10, maxAttr: 5, attrPoints: 20, baseDamage: "1D4" },
  ];

  const mockTraitElements = [
    {
      id: "trait_vol_plus_1",
      name: "Fortaleza Mental",
      kind: "trait",
      mechanicalBehaviors: [
        {
          id: "vol_mod_1",
          mode: "continuous",
          effects: [
            { id: "eff_vol_1", type: "attribute_modifier", attributeId: "vol", amount: 1 },
          ],
        },
      ],
    },
  ];

  it("A — Base budget complete + Trait: Valid, base 20/20, effective total 21", () => {
    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5, // Sum = 20
      traits: ["trait_vol_plus_1"],
    };

    const traitBonus = calculateTraitAttributeBonus(profile, mockTraitElements);
    expect(traitBonus.total).toBe(1);
    expect(traitBonus.byAttr.VOL).toBe(1);

    const validation = validateCharacter(profile, mockStages, 0, 5, traitBonus.total);
    expect(validation.status).toBe("green");
    expect(validation.messages).toHaveLength(0);

    const derived = calculateDerivedStats(profile, mockStages, mockTraitElements);
    expect(derived.baseAttributes.VOL).toBe(3);
    expect(derived.attributes.VOL).toBe(4);
    
    const effectiveTotal = Object.values(derived.attributes).reduce((a, b) => a + b, 0);
    expect(effectiveTotal).toBe(21);
  });

  it("B — Base budget incomplete + Trait: Invalid, 1 base point missing", () => {
    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 2, VEL: 5, // Sum = 19 (1 point missing)
      traits: ["trait_vol_plus_1"], // Grants +1 VOL
    };

    const traitBonus = calculateTraitAttributeBonus(profile, mockTraitElements);
    expect(traitBonus.total).toBe(1);

    const validation = validateCharacter(profile, mockStages, 0, 5, traitBonus.total);
    expect(validation.status).toBe("orange");
    expect(validation.messages.some((m) => m.includes("Falta 1 punto de atributo por repartir"))).toBe(true);
  });

  it("C — Purchased points: Valid when base sum matches stage + purchased budget", () => {
    const profile = {
      basic_stage: "Novato",
      FUE: 4, DES: 2, RES: 2, INT: 5, VOL: 4, VEL: 5, // Sum = 22 (20 stage + 2 purchased)
    };

    const purchasedAttrPoints = 2;
    const validation = validateCharacter(profile, mockStages, purchasedAttrPoints, 5, 0);
    expect(validation.status).toBe("green");
    expect(validation.messages).toHaveLength(0);
  });

  it("D — Purchased + Trait: Valid, base budget 22/22, effective total 23", () => {
    const profile = {
      basic_stage: "Novato",
      FUE: 4, DES: 2, RES: 2, INT: 5, VOL: 4, VEL: 5, // Sum = 22
      traits: ["trait_vol_plus_1"], // +1 VOL
    };

    const purchasedAttrPoints = 2;
    const traitBonus = calculateTraitAttributeBonus(profile, mockTraitElements);
    const validation = validateCharacter(profile, mockStages, purchasedAttrPoints, 5, traitBonus.total);
    
    expect(validation.status).toBe("green");
    expect(validation.messages).toHaveLength(0);

    const derived = calculateDerivedStats(profile, mockStages, mockTraitElements);
    expect(derived.attributes.VOL).toBe(5);
    const effectiveTotal = Object.values(derived.attributes).reduce((a, b) => a + b, 0);
    expect(effectiveTotal).toBe(23);
  });

  it("E — Too many base points: Invalid when base sum exceeds budget", () => {
    const profile = {
      basic_stage: "Novato",
      FUE: 4, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5, // Sum = 21 (Budget = 20)
    };

    const validation = validateCharacter(profile, mockStages, 0, 5, 0);
    expect(validation.status).toBe("red");
    expect(validation.messages.some((m) => m.includes("Se ha excedido 1 punto de atributo base"))).toBe(true);
  });

  it("F — Trait does not inflate stage max attribute cap for base attributes", () => {
    const profile = {
      basic_stage: "Novato", // maxAttr = 5
      FUE: 6, DES: 2, RES: 2, INT: 5, VOL: 1, VEL: 4, // Sum = 20, but FUE = 6 > 5
      traits: ["trait_vol_plus_1"], // VOL +1
    };

    const traitBonus = calculateTraitAttributeBonus(profile, mockTraitElements);
    const validation = validateCharacter(profile, mockStages, 0, 5, traitBonus.total);

    expect(validation.status).toBe("red");
    expect(validation.messages.some((m) => m.includes("Uno o más atributos superan el límite de etapa"))).toBe(true);
  });
});

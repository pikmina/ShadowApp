import { describe, it, expect } from "vitest";
import { validateCharacter } from "../../lib/characterValidation";

describe("Stage Max-Attribute Count Rule and Talentoso Trait", () => {
  const canonicalStages = [
    { name: "Novato", attrPoints: 20, maxAttr: 5, maxAttributesAtCap: 2 },
    { name: "Emergente", attrPoints: 25, maxAttr: 6, maxAttributesAtCap: 2 },
    { name: "Elite", attrPoints: 30, maxAttr: 8, maxAttributesAtCap: 3 },
    { name: "Veterano", attrPoints: 35, maxAttr: 10, maxAttributesAtCap: 3 },
    { name: "Emblema", attrPoints: 40, maxAttr: 11, maxAttributesAtCap: 4 },
    { name: "Leyenda", attrPoints: 45, maxAttr: 12, maxAttributesAtCap: 5 },
  ];

  it("1. Normal limit respected: Novato with 2 attributes at max (5) is valid", () => {
    // 5 + 5 + 4 + 2 + 2 + 2 = 20 points
    const profile = {
      basic_stage: "Novato",
      FUE: 5,
      VEL: 5,
      RES: 4,
      INT: 2,
      VOL: 2,
      DES: 2,
      traits: [],
    };

    const res = validateCharacter(profile, canonicalStages);
    expect(res.status).toBe("green");
    expect(res.messages).toHaveLength(0);
  });

  it("2. Limit violation without Talentoso: Novato with 3 attributes at max (5) is rejected with error", () => {
    // 5 + 5 + 5 + 2 + 2 + 1 = 20 points
    const profile = {
      basic_stage: "Novato",
      FUE: 5,
      VEL: 5,
      RES: 5,
      INT: 2,
      VOL: 2,
      DES: 1,
      traits: [],
    };

    const res = validateCharacter(profile, canonicalStages);
    expect(res.status).toBe("red");
    expect(res.messages).toContain("Se ha superado el límite de atributos al máximo (3/2).");
  });

  it("3. Talentoso interaction: Novato with Talentoso allows 3 attributes at max (5)", () => {
    // 5 + 5 + 5 + 2 + 2 + 1 = 20 points
    const profile = {
      basic_stage: "Novato",
      FUE: 5,
      VEL: 5,
      RES: 5,
      INT: 2,
      VOL: 2,
      DES: 1,
      traits: ["core.trait.talented"],
    };

    const res = validateCharacter(profile, canonicalStages);
    expect(res.status).toBe("green");
    expect(res.messages).toHaveLength(0);
  });

  it("4. Talentoso limit violation: Novato with Talentoso and 4 attributes at max (5) is rejected", () => {
    // 5 + 5 + 5 + 5 + 0 + 0 = 20 points
    const profile = {
      basic_stage: "Novato",
      FUE: 5,
      VEL: 5,
      RES: 5,
      INT: 5,
      VOL: 0,
      DES: 0,
      traits: ["core.trait.talented"],
    };

    const res = validateCharacter(profile, canonicalStages);
    expect(res.status).toBe("red");
    expect(res.messages).toContain("Se ha superado el límite de atributos al máximo (4/3).");
  });

  it("5. Purchased Attribute Upgrades do NOT count toward the cap count", () => {
    // Novato maxAttr is 5.
    // Base: FUE 5, VEL 5, RES 4, INT 2, VOL 2, DES 2 (total 20 base points). 2 at cap (5).
    // Purchased upgrade adds +1 to RES making effective RES 5.
    // Base attributes at cap remain exactly 2 (FUE and VEL).
    const profile = {
      basic_stage: "Novato",
      FUE: 5,
      VEL: 5,
      RES: 4,
      INT: 2,
      VOL: 2,
      DES: 2,
      traits: [],
    };

    const purchasedAttrPoints = 1; // 1 upgrade purchased
    const res = validateCharacter(profile, canonicalStages, purchasedAttrPoints, 5, 0);
    expect(res.status).toBe("green");
    expect(res.messages).toHaveLength(0);
  });

  it("6. Trait attribute modifiers do NOT count toward the cap count", () => {
    // Base: FUE 5, VEL 5, RES 4, INT 2, VOL 2, DES 2 (total 20 base points). 2 at cap (5).
    // A trait grants +1 to RES.
    // Base attributes at cap remain exactly 2 (FUE and VEL).
    const profile = {
      basic_stage: "Novato",
      FUE: 5,
      VEL: 5,
      RES: 4,
      INT: 2,
      VOL: 2,
      DES: 2,
      traits: ["some_trait_with_attribute_bonus"],
    };

    const traitAttrPoints = 1;
    const res = validateCharacter(profile, canonicalStages, 0, 5, traitAttrPoints);
    expect(res.status).toBe("green");
    expect(res.messages).toHaveLength(0);
  });

  it("7. Fallback for legacy / unconfigured stage without maxAttributesAtCap does not block characters", () => {
    const unconfiguredStages = [
      { name: "LegacyStage", attrPoints: 20, maxAttr: 5 }, // maxAttributesAtCap is undefined
    ];

    const profile = {
      basic_stage: "LegacyStage",
      FUE: 5,
      VEL: 5,
      RES: 5,
      INT: 2,
      VOL: 2,
      DES: 1,
      traits: [],
    };

    const res = validateCharacter(profile, unconfiguredStages);
    // When maxAttributesAtCap is undefined, the cap-count rule is not configured,
    // so it does NOT invent a rule or block characters.
    expect(res.status).toBe("green");
    expect(res.messages).toHaveLength(0);
  });

  it("8. Custom stage configuration with higher limits", () => {
    const customStages = [
      { name: "Custom", attrPoints: 30, maxAttr: 7, maxAttributesAtCap: 4 },
    ];

    const profile = {
      basic_stage: "Custom",
      FUE: 7,
      VEL: 7,
      RES: 7,
      INT: 7,
      VOL: 1,
      DES: 1,
      traits: [],
    };

    const res = validateCharacter(profile, customStages);
    expect(res.status).toBe("green");
    expect(res.messages).toHaveLength(0);
  });

  it("9. Talentoso does NOT increase individual maxAttr", () => {
    // Novato maxAttr is 5. Attribute with 6 is invalid even with Talentoso.
    const profile = {
      basic_stage: "Novato",
      FUE: 6,
      VEL: 4,
      RES: 4,
      INT: 2,
      VOL: 2,
      DES: 2,
      traits: ["core.trait.talented"],
    };

    const res = validateCharacter(profile, canonicalStages);
    expect(res.status).toBe("red");
    expect(res.messages).toContain("Uno o más atributos superan el límite de etapa (Máx. 5).");
  });
});

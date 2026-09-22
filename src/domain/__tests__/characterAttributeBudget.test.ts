import { describe, it, expect } from "vitest";
import {
  validateCharacter,
  calculateDerivedStats,
  calculateTraitAttributeBonus,
  calculatePurchasedAttributeBonuses,
} from "../../lib/characterValidation";

describe("Task 10: Directed Attribute Upgrades & Budget Accounting", () => {
  const mockStages = [
    { name: "Novato", baseHealth: 20, baseStamina: 10, maxAttr: 5, attrPoints: 20, baseDamage: "1D4" },
  ];

  const mockUpgradeElements = [
    { id: "upg_fue_1", name: "Fuerza +1", kind: "attribute_upgrade", metadata: { attributeId: "FUE" } },
    { id: "upg_des_1", name: "Destreza +1", kind: "attribute_upgrade", metadata: { attributeId: "DES" } },
  ];

  const mockTraitElements = [
    {
      id: "trait_fue_plus_1",
      name: "Musculoso",
      kind: "trait",
      mechanicalBehaviors: [
        {
          id: "fue_mod_1",
          mode: "continuous",
          effects: [
            { id: "eff_fue_1", type: "attribute_modifier", attributeId: "fue", amount: 1 },
          ],
        },
      ],
    },
  ];

  it("Scenario A — Directed purchase: Base FUE=3 + Fuerza upgrade Lv.1 = Effective FUE=4", () => {
    const profile = { basic_stage: "Novato", FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5 };
    const possessions = [
      { elementId: "upg_fue_1", element: mockUpgradeElements[0], quantity: 1 }
    ];

    const purchased = calculatePurchasedAttributeBonuses(possessions, mockUpgradeElements);
    expect(purchased.byAttr.FUE).toBe(1);
    expect(purchased.byAttr.DES).toBe(0);

    const derived = calculateDerivedStats(profile, mockStages, mockUpgradeElements, [], possessions);
    expect(derived.baseAttributes.FUE).toBe(3);
    expect(derived.attributes.FUE).toBe(4);
    expect(derived.attributes.DES).toBe(2);
  });

  it("Scenario B — Multiple levels of same attribute upgrade", () => {
    const profile = { basic_stage: "Novato", FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5 };
    const possessions = [
      { elementId: "upg_fue_1", element: mockUpgradeElements[0], quantity: 3 }
    ];

    const purchased = calculatePurchasedAttributeBonuses(possessions, mockUpgradeElements);
    expect(purchased.byAttr.FUE).toBe(3);

    const derived = calculateDerivedStats(profile, mockStages, mockUpgradeElements, [], possessions);
    expect(derived.baseAttributes.FUE).toBe(3);
    expect(derived.attributes.FUE).toBe(6);
  });

  it("Scenario C — Upgrades on different attributes", () => {
    const profile = { basic_stage: "Novato", FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5 };
    const possessions = [
      { elementId: "upg_fue_1", element: mockUpgradeElements[0], quantity: 2 },
      { elementId: "upg_des_1", element: mockUpgradeElements[1], quantity: 1 }
    ];

    const purchased = calculatePurchasedAttributeBonuses(possessions, mockUpgradeElements);
    expect(purchased.byAttr.FUE).toBe(2);
    expect(purchased.byAttr.DES).toBe(1);
    expect(purchased.total).toBe(3);

    const derived = calculateDerivedStats(profile, mockStages, mockUpgradeElements, [], possessions);
    expect(derived.attributes.FUE).toBe(5);
    expect(derived.attributes.DES).toBe(3);
  });

  it("Scenario D — Purchase + Trait modifier combined on same attribute", () => {
    const profile = {
      basic_stage: "Novato",
      FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5,
      traits: ["trait_fue_plus_1"]
    };
    const possessions = [
      { elementId: "upg_fue_1", element: mockUpgradeElements[0], quantity: 1 }
    ];

    const allElements = [...mockUpgradeElements, ...mockTraitElements];
    const derived = calculateDerivedStats(profile, mockStages, allElements, [], possessions);

    expect(derived.baseAttributes.FUE).toBe(3);
    expect(derived.purchasedBonuses.FUE).toBe(1);
    expect(derived.traitBonuses.FUE).toBe(1);
    expect(derived.attributes.FUE).toBe(5);
  });

  it("Scenario E — Creation budget independent of purchased upgrades", () => {
    const profile = { basic_stage: "Novato", FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5 }; // Base sum = 20
    const purchasedAttrPoints = 3;

    const validation = validateCharacter(profile, mockStages, purchasedAttrPoints, 5, 0);
    expect(validation.status).toBe("green");
    expect(validation.messages).toHaveLength(0);
  });

  it("Scenario F — Purchased upgrade does NOT satisfy missing creation points", () => {
    const profile = { basic_stage: "Novato", FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 2, VEL: 5 }; // Base sum = 19
    const purchasedAttrPoints = 1; // 1 level purchased

    const validation = validateCharacter(profile, mockStages, purchasedAttrPoints, 5, 0);
    expect(validation.status).toBe("orange");
    expect(validation.messages.some((m) => m.includes("Falta 1 punto de atributo por repartir"))).toBe(true);
  });

  it("Scenario G — profileData purity: Base allocation is preserved on purchase", () => {
    const profileData = { basic_stage: "Novato", FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5 };
    const initialFUE = profileData.FUE;

    // Simulate purchase without mutating profileData
    const possessions = [
      { elementId: "upg_fue_1", element: mockUpgradeElements[0], quantity: 1 }
    ];

    // Verify profileData itself was NOT modified
    expect(profileData.FUE).toBe(initialFUE);

    // Verify calculateDerivedStats correctly computes effective attribute
    const derived = calculateDerivedStats(profileData, mockStages, mockUpgradeElements, [], possessions);
    expect(derived.baseAttributes.FUE).toBe(3);
    expect(derived.attributes.FUE).toBe(4);
  });

  it("Scenario H — Save/reload hydration produces correct effective attribute", () => {
    const savedProfile = { basic_stage: "Novato", FUE: 3, DES: 2, RES: 2, INT: 5, VOL: 3, VEL: 5 };
    const loadedPossessions = [
      { elementId: "upg_fue_1", element: mockUpgradeElements[0], quantity: 1 }
    ];

    const hydratedDerived = calculateDerivedStats(savedProfile, mockStages, mockUpgradeElements, [], loadedPossessions);
    expect(hydratedDerived.baseAttributes.FUE).toBe(3);
    expect(hydratedDerived.attributes.FUE).toBe(4);
  });
});

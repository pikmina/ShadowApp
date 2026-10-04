import { describe, it, expect } from "vitest";
import { calculateDerivedStats, calculateEquipmentBonuses } from "../../lib/characterValidation";
import { describeMechanicalCondition } from "../mechanicalDescription";
import { getComparisonOperatorLabel, getStatOrResourceLabel } from "../mechanicalLabels";

describe("Conditional Modifiers and Stat-Based Conditions", () => {
  it("formats comparison operators and stat labels correctly in Spanish", () => {
    expect(getComparisonOperatorLabel(">")).toBe("es mayor que (>)");
    expect(getComparisonOperatorLabel(">=")).toBe("es mayor o igual que (≥)");
    expect(getComparisonOperatorLabel("<")).toBe("es menor que (<)");
    expect(getComparisonOperatorLabel("<=")).toBe("es menor o igual que (≤)");
    expect(getComparisonOperatorLabel("=")).toBe("es igual a (=)");

    expect(getStatOrResourceLabel("RES")).toBe("Resistencia (RES)");
    expect(getStatOrResourceLabel("EVA")).toBe("Evasión (EVA)");
    expect(getStatOrResourceLabel("ES")).toBe("Estamina (ES)");
    expect(getStatOrResourceLabel("SA")).toBe("Salud (SA)");

    const condRes5 = {
      type: "resource" as const,
      resourceId: "RES",
      comparison: ">" as const,
      value: 5,
    };
    const descRes5 = describeMechanicalCondition(condRes5);
    expect(descRes5.text).toBe("Si Resistencia (RES) es mayor que 5");

    const condRes7 = {
      type: "attribute" as const,
      attributeId: "RES",
      comparison: ">" as const,
      value: 7,
    };
    const descRes7 = describeMechanicalCondition(condRes7);
    expect(descRes7.text).toBe("Si Resistencia (RES) es mayor que 7");
  });

  it("applies conditional equipment modifiers based on character attributes (e.g. RES > 5 -> EVA -1, RES > 7 -> EVA -2)", () => {
    const stages = [
      {
        name: "Aspirante",
        baseHealth: 20,
        baseStamina: 20,
        maxAttr: 10,
        attrPoints: 20,
      },
    ];

    // Armor with 2 conditional behaviors:
    // 1) Si RES > 5, EVA -1
    // 2) Si RES > 7, EVA -2
    const heavyArmor = {
      id: "heavy_armor_1",
      name: "Armadura Pesada",
      kind: "equipment",
      mechanicalBehaviors: [
        {
          id: "bh_res_5",
          mode: "continuous",
          conditions: [
            {
              type: "resource",
              resourceId: "RES",
              comparison: ">",
              value: 5,
            },
          ],
          effects: [
            {
              id: "eff_eva_minus_1",
              type: "derived_stat_modifier",
              statId: "EVA",
              amount: -1,
            },
          ],
        },
        {
          id: "bh_res_7",
          mode: "continuous",
          conditions: [
            {
              type: "resource",
              resourceId: "RES",
              comparison: ">",
              value: 7,
            },
          ],
          effects: [
            {
              id: "eff_eva_minus_2",
              type: "derived_stat_modifier",
              statId: "EVA",
              amount: -2,
            },
          ],
        },
      ],
    };

    const elements = [heavyArmor];
    const possessions = [
      {
        id: "poss_1",
        elementId: "heavy_armor_1",
        equipped: true,
      },
    ];

    // Case 1: Character with RES = 4 (neither condition met)
    const profileLowRes = {
      basic_stage: "Aspirante",
      FUE: 3,
      DES: 3,
      RES: 4,
      INT: 3,
      VOL: 3,
      VEL: 4, // base EVA = 10 + 4 = 14
      possessions,
    };
    const statsLowRes = calculateDerivedStats(profileLowRes, stages, elements, [], possessions);
    expect(statsLowRes.evasion).toBe(14); // 10 + 4 - 0
    expect(statsLowRes.derivedSources.evasion).toHaveLength(0);

    // Case 2: Character with RES = 6 (only RES > 5 met: EVA -1)
    const profileMidRes = {
      basic_stage: "Aspirante",
      FUE: 3,
      DES: 3,
      RES: 6,
      INT: 2,
      VOL: 2,
      VEL: 4, // base EVA = 10 + 4 = 14
      possessions,
    };
    const statsMidRes = calculateDerivedStats(profileMidRes, stages, elements, [], possessions);
    expect(statsMidRes.evasion).toBe(13); // 10 + 4 - 1 = 13
    expect(statsMidRes.derivedSources.evasion).toEqual([
      { name: "Armadura Pesada", amount: -1, kind: "equipment" },
    ]);

    // Case 3: Character with RES = 8 (both RES > 5 and RES > 7 met: EVA -1 + -2 = -3)
    const profileHighRes = {
      basic_stage: "Aspirante",
      FUE: 2,
      DES: 2,
      RES: 8,
      INT: 2,
      VOL: 2,
      VEL: 4, // base EVA = 10 + 4 = 14
      possessions,
    };
    const statsHighRes = calculateDerivedStats(profileHighRes, stages, elements, [], possessions);
    expect(statsHighRes.evasion).toBe(11); // 10 + 4 - 3 = 11
    expect(statsHighRes.derivedSources.evasion).toEqual([
      { name: "Armadura Pesada", amount: -1, kind: "equipment" },
      { name: "Armadura Pesada", amount: -2, kind: "equipment" },
    ]);
  });
});

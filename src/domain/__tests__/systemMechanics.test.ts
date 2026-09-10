import { describe, expect, test } from "vitest";
import {
  calculateCanonicalMechanicalCost,
  canonicalMechanicalEffectsSchema,
  effectTargetingSchema,
  systemMechanicsConfigSchema,
  validatePersistedMechanicalEffects,
  type CanonicalMechanicalEffect,
  type EffectTargeting,
  type SystemMechanicsConfig,
} from "../systemMechanics";

const selfTarget: EffectTargeting = {
  allowedEntityKinds: ["character"],
  relationship: "self",
  selection: "direct",
  minTargets: 1,
  maxTargets: 1,
};

const twoEnemies: EffectTargeting = {
  allowedEntityKinds: ["character", "npc"],
  relationship: "enemy",
  selection: "direct",
  minTargets: 1,
  maxTargets: 2,
};

const mechanics: SystemMechanicsConfig = [
  {
    id: "damage",
    name: "Daño",
    description: "Costes de daño",
    logicalType: "offensive",
    scope: { techniques: true, objects: true, actions: false },
    rules: [{ id: "damage_2d6", name: "2D6", cost: 3 }],
  },
];

describe("EffectTargeting contract", () => {
  test("accepts an explicit quantity of enemy targets", () => {
    expect(effectTargetingSchema.safeParse(twoEnemies).success).toBe(true);
  });

  test("requires self effects to select exactly one direct target", () => {
    expect(
      effectTargetingSchema.safeParse({
        ...selfTarget,
        maxTargets: 2,
      }).success,
    ).toBe(false);
  });

  test("only permits an unlimited maximum for area selection", () => {
    expect(
      effectTargetingSchema.safeParse({
        ...twoEnemies,
        maxTargets: null,
      }).success,
    ).toBe(false);

    expect(
      effectTargetingSchema.safeParse({
        ...twoEnemies,
        selection: "area",
        maxTargets: null,
      }).success,
    ).toBe(true);
  });
});

describe("Canonical mechanical effects", () => {
  test("keeps behavior, targeting and cost references in separate fields", () => {
    const parsed = canonicalMechanicalEffectsSchema.safeParse([
      {
        id: "effect_1",
        type: "damage",
        dice: "2D6",
        timing: "on_hit",
        targeting: twoEnemies,
        costRules: [{ mechanicId: "damage", ruleId: "damage_2d6" }],
      },
    ]);

    expect(parsed.success).toBe(true);
  });

  test("rejects legacy target and copied cost properties", () => {
    const parsed = canonicalMechanicalEffectsSchema.safeParse([
      {
        id: "effect_1",
        type: "damage",
        dice: "2D6",
        timing: "on_hit",
        targeting: twoEnemies,
        costRules: [],
        target: "enemy",
        cost: 3,
      },
    ]);

    expect(parsed.success).toBe(false);
  });

  test("preserves legacy records but rejects malformed canonical records", () => {
    const legacy = { _id: "old", type: "deal_damage", target: "enemy" };
    const malformedCanonical = { id: "new", type: "damage", target: "enemy" };

    const legacyResult = validatePersistedMechanicalEffects([legacy]);
    const canonicalResult = validatePersistedMechanicalEffects([malformedCanonical]);

    expect(legacyResult.valid).toBe(true);
    expect(legacyResult.legacyEffects).toEqual([legacy]);
    expect(canonicalResult.valid).toBe(false);
  });
});

describe("System mechanics configuration", () => {
  test("rejects duplicate category and rule identities", () => {
    const parsed = systemMechanicsConfigSchema.safeParse([
      mechanics[0],
      {
        ...mechanics[0],
        rules: [{ id: "damage_2d6", name: "Duplicada", cost: 8 }],
      },
    ]);

    expect(parsed.success).toBe(false);
  });

  test("resolves cost only from the current system rule", () => {
    const effects: CanonicalMechanicalEffect[] = [
      {
        id: "effect_1",
        type: "damage",
        dice: "2D6",
        timing: "on_hit",
        targeting: twoEnemies,
        costRules: [{ mechanicId: "damage", ruleId: "damage_2d6" }],
      },
    ];

    const result = calculateCanonicalMechanicalCost(effects, mechanics);

    expect(result.valid).toBe(true);
    expect(result.total).toBe(3);
    expect(result.breakdown).toHaveLength(1);
  });

  test("invalidates an unknown rule instead of using a copied fallback", () => {
    const effects: CanonicalMechanicalEffect[] = [
      {
        id: "effect_1",
        type: "damage",
        dice: "2D6",
        timing: "on_hit",
        targeting: selfTarget,
        costRules: [{ mechanicId: "damage", ruleId: "missing" }],
      },
    ];

    const result = calculateCanonicalMechanicalCost(effects, mechanics);

    expect(result.valid).toBe(false);
    expect(result.total).toBeNull();
    expect(result.issues[0]?.code).toBe("unknown_cost_reference");
  });

  test("does not charge the same rule twice within one effect", () => {
    const reference = { mechanicId: "damage", ruleId: "damage_2d6" };
    const effects: CanonicalMechanicalEffect[] = [
      {
        id: "effect_1",
        type: "damage",
        dice: "2D6",
        timing: "on_hit",
        targeting: selfTarget,
        costRules: [reference, reference],
      },
    ];

    const result = calculateCanonicalMechanicalCost(effects, mechanics);

    expect(result.valid).toBe(false);
    expect(result.total).toBeNull();
    expect(result.issues[0]?.code).toBe("duplicate_cost_reference");
  });
});

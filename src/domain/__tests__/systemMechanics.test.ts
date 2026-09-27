import { describe, expect, test } from "vitest";
import {
  calculateCanonicalMechanicalCost,
  calculateExecutionStaminaCost,
  canonicalMechanicalEffectsSchema,
  effectTargetingSchema,
  mechanicalEffectDefinitionSchema,
  systemMechanicsConfigSchema,
  resolveAppliedMechanics,
  validatePersistedMechanicalEffects,
  type CanonicalMechanicalEffect,
  type EffectTargeting,
  type SystemMechanicsConfig,
} from "../systemMechanics";
import { calculateDerivedStats } from "../../lib/characterValidation";
import { createEffectDefinition } from "../../components/mechanics/MechanicalEffectDefinitionEditor";
import { describeMechanicalBehavior } from "../mechanicalDescription";
import type { MechanicalBehavior } from "../mechanicalBehavior";

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
    targeting: twoEnemies,
    rules: [{ id: "damage_2d6", name: "2D6", cost: 3, ruleType: "effect", effect: { type: "damage", dice: "2D6", timing: "on_hit" } }],
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
        rules: [{ id: "damage_2d6", name: "Duplicada", cost: 8, ruleType: "cost_modifier" }],
      },
    ]);

    expect(parsed.success).toBe(false);
  });

  test("materializes behavior, targets and Stamina cost from one global option", () => {
    const references = [{ applicationId: "application_1", mechanicId: "damage", ruleId: "damage_2d6" }];
    const result = resolveAppliedMechanics(references, mechanics);

    expect(result.valid).toBe(true);
    expect(result.staminaCost).toBe(3);
    expect(result.effects[0]).toMatchObject({ id: "application_1", type: "damage", dice: "2D6", targeting: twoEnemies });
    expect(references[0]).not.toHaveProperty("dice");
    expect(references[0]).not.toHaveProperty("cost");
  });

  test("adds the configured execution base and only mechanics enabled for that context", () => {
    const references = [{ applicationId: "application_1", mechanicId: "damage", ruleId: "damage_2d6" }];
    const policy = { baseAction: 1, objectUse: 2, techniqueByLevel: [{ level: 5, cost: 5 }], skillByLevel: [{ level: 5, cost: 4 }] };

    expect(calculateExecutionStaminaCost(references, mechanics, policy, "object")).toBe(3);
    expect(calculateExecutionStaminaCost(references, mechanics, policy, "technique", 5)).toBe(5);
    expect(calculateExecutionStaminaCost(references, mechanics, policy, "action")).toBe(1);
  });

  test("allows Stamina costs on effect rules in system mechanics", () => {
    const parsed = systemMechanicsConfigSchema.safeParse([{ ...mechanics[0], rules: [{ id: "evasion_plus", name: "+1 Evasión", cost: 2, ruleType: "effect", effect: { type: "derived_stat_modifier", statId: "EVA", amount: 1, timing: "on_activation" } }] }]);
    expect(parsed.success).toBe(true);
  });

  test("applies a referenced passive trait permanently without charging Stamina", () => {
    const passiveMechanics = systemMechanicsConfigSchema.parse([{ ...mechanics[0], id: "health", targeting: selfTarget, rules: [{ id: "health_2", name: "+2 Salud", cost: 0, ruleType: "effect", effect: { type: "derived_stat_modifier", statId: "SAL", amount: 2, timing: "passive" } }] }]);
    const elements = [{ id: "trait_1", effects: [{ applicationId: "application_1", mechanicId: "health", ruleId: "health_2" }] }];
    const profile = { basic_stage: "Novato", traits: ["trait_1"], RES: 3 };
    const stages = [{ name: "Novato", baseHealth: 20, baseStamina: 10, baseDamage: "1D4" }];

    expect(calculateDerivedStats(profile, stages, elements, passiveMechanics).salud).toBe(25);
    expect(resolveAppliedMechanics(elements[0].effects, passiveMechanics).staminaCost).toBe(0);
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

describe("Mechanical Option independence from 'Cuándo se aplica'", () => {
  test("+1 Evasión option does not require 'Cuándo se aplica' (timing) and validates cleanly", () => {
    // Definition strictly without timing: only QUÉ (statId: EVA), CUÁNTO (amount: 1)
    const evasionEffect = {
      type: "derived_stat_modifier" as const,
      statId: "EVA",
      amount: 1,
    };

    const parsedDef = mechanicalEffectDefinitionSchema.safeParse(evasionEffect);
    expect(parsedDef.success).toBe(true);
    if (parsedDef.success) {
      expect(parsedDef.data.type).toBe("derived_stat_modifier");
      expect((parsedDef.data as any).timing).toBeUndefined();
    }

    // Config with option without timing
    const parsedConfig = systemMechanicsConfigSchema.safeParse([
      {
        ...mechanics[0],
        rules: [
          {
            id: "opt_eva_1",
            name: "+1 Evasión",
            cost: 0,
            ruleType: "effect",
            effect: evasionEffect,
          },
        ],
      },
    ]);
    expect(parsedConfig.success).toBe(true);
  });

  test("createEffectDefinition creates agnostic effect definitions without default timing", () => {
    const newDef = createEffectDefinition("derived_stat_modifier");
    expect(newDef.type).toBe("derived_stat_modifier");
    expect((newDef as any).timing).toBeUndefined();

    const damageDef = createEffectDefinition("damage");
    expect(damageDef.type).toBe("damage");
    expect((damageDef as any).timing).toBeUndefined();
  });

  test("can be used in MechanicalBehavior with continuous mode and equipped condition", () => {
    const behavior: MechanicalBehavior = {
      id: "beh_boots_eva",
      name: "Botas de Agilidad",
      mode: "continuous",
      conditions: [{ type: "equipped" }],
      conditionLogic: "all",
      limitations: [],
      effects: [
        {
          id: "eff_eva_1",
          type: "derived_stat_modifier",
          statId: "EVA",
          amount: 1,
          operation: "add",
        },
      ],
    };

    // Automatic description comes from behavior, not from option's timing
    const description = describeMechanicalBehavior(behavior, { format: "compact" });
    expect(description.text).toBe("Mientras esté equipado, otorga +1 a Evasión.");

    // Execution in character stats:
    const dummyStages = [{ id: "novato", name: "Novato", statCap: 10, maxAttributes: 30 }];
    const bootsElement = {
      id: "item_boots_eva",
      name: "Botas de Agilidad",
      kind: "equipment",
      status: "published",
      mechanicalBehaviors: [behavior],
    };

    const profile = {
      stage: "Novato",
      FUE: 3, DES: 3, RES: 3, INT: 3, VOL: 3, VEL: 3,
    };

    // When unequipped: bonus = 0
    const unequippedStats = calculateDerivedStats(profile, dummyStages, [bootsElement], [], [
      { elementId: "item_boots_eva", quantity: 1, equipped: false },
    ]);
    expect(unequippedStats.equipmentDerivedBonuses.evasion).toBe(0);

    // When equipped: bonus = 1
    const equippedStats = calculateDerivedStats(profile, dummyStages, [bootsElement], [], [
      { elementId: "item_boots_eva", quantity: 1, equipped: true },
    ]);
    expect(equippedStats.equipmentDerivedBonuses.evasion).toBe(1);
  });

  test("preserves backwards compatibility with legacy rules containing timing", () => {
    const legacyPassiveEffect = {
      type: "derived_stat_modifier" as const,
      statId: "EVA",
      amount: 1,
      timing: "passive" as const,
    };

    const parsedDef = mechanicalEffectDefinitionSchema.safeParse(legacyPassiveEffect);
    expect(parsedDef.success).toBe(true);
    if (parsedDef.success) {
      expect((parsedDef.data as any).timing).toBe("passive");
    }

    const legacyActivationEffect = {
      type: "damage" as const,
      dice: "2D6",
      timing: "on_activation" as const,
    };

    const parsedActivation = mechanicalEffectDefinitionSchema.safeParse(legacyActivationEffect);
    expect(parsedActivation.success).toBe(true);
  });
});

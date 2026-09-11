import { z } from "zod";

export const mechanicalEffectTypeSchema = z.enum([
  "attribute_modifier",
  "derived_stat_modifier",
  "damage",
  "healing",
  "barrier",
  "status",
  "currency",
  "rule_override",
  "choice",
]);

export const effectTimingSchema = z.enum([
  "passive",
  "on_activation",
  "on_hit",
  "on_critical",
  "after_effect",
  "turn_start",
  "each_turn",
  "on_fumble",
]);

export const effectTargetingSchema = z
  .strictObject({
    allowedEntityKinds: z.array(z.enum(["character", "npc"])).min(1),
    relationship: z.enum(["self", "ally", "enemy", "any"]),
    selection: z.enum(["direct", "area"]),
    minTargets: z.number().int().positive(),
    maxTargets: z.number().int().positive().nullable(),
    overflowSelection: z
      .enum(["highest_initiative", "lowest_initiative"])
      .optional(),
    targetingCostRuleId: z.string().min(1).optional(),
  })
  .superRefine((targeting, ctx) => {
    if (
      targeting.maxTargets !== null &&
      targeting.minTargets > targeting.maxTargets
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxTargets"],
        message: "maxTargets must be greater than or equal to minTargets",
      });
    }

    if (
      targeting.relationship === "self" &&
      (targeting.selection !== "direct" ||
        targeting.minTargets !== 1 ||
        targeting.maxTargets !== 1)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["relationship"],
        message: "self targeting must be direct and select exactly one target",
      });
    }

    if (targeting.maxTargets === null && targeting.selection !== "area") {
      ctx.addIssue({
        code: "custom",
        path: ["maxTargets"],
        message: "an unlimited maximum is only valid for area selection",
      });
    }
  });

export const costRuleReferenceSchema = z.strictObject({
  mechanicId: z.string().min(1),
  ruleId: z.string().min(1),
});

const baseEffectShape = {
  id: z.string().min(1),
  timing: effectTimingSchema,
  targeting: effectTargetingSchema,
  costRules: z.array(costRuleReferenceSchema).default([]),
};

const durationSchema = z.strictObject({
  value: z.number().int().positive(),
  unit: z.enum(["turn", "round", "scene"]),
});

export const mechanicalEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("attribute_modifier"),
    attributeId: z.string().min(1),
    amount: z.number(),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("derived_stat_modifier"),
    statId: z.string().min(1),
    amount: z.number(),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("damage"),
    dice: z.string().min(1),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("healing"),
    resourceId: z.enum(["SA", "ES"]),
    amount: z.number().positive(),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("barrier"),
    amount: z.number().positive(),
    duration: durationSchema.optional(),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("status"),
    statusElementId: z.string().min(1),
    duration: durationSchema.optional(),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("currency"),
    currencyId: z.enum(["yen", "exp"]),
    amount: z.number().int(),
    frequencyRuleId: z.string().min(1).optional(),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("rule_override"),
    ruleId: z.string().min(1),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("choice"),
    options: z.array(z.string().min(1)).min(1),
  }),
]);

export const canonicalMechanicalEffectsSchema = z.array(mechanicalEffectSchema);

const mechanicRuleSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    cost: z.number().finite(),
    mechDesc: z.string().optional(),
  })
  .passthrough();

const mechanicCategorySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    logicalType: z.enum([
      "offensive",
      "defensive",
      "support",
      "control",
      "limitation",
      "utility",
    ]),
    icon: z.string().min(1).optional(),
    scope: z
      .object({
        techniques: z.boolean(),
        objects: z.boolean(),
        actions: z.boolean(),
      })
      .passthrough(),
    defaultTarget: z.enum(["self", "enemy", "ally", "any"]).optional(),
    defaultTargeting: effectTargetingSchema.optional(),
    defaultResolution: z
      .enum(["none", "eva", "cor", "rd", "opposed"])
      .optional(),
    rules: z.array(mechanicRuleSchema),
  })
  .passthrough();

export const systemMechanicsConfigSchema = z
  .array(mechanicCategorySchema)
  .superRefine((categories, ctx) => {
    const categoryIds = new Set<string>();
    const ruleIds = new Set<string>();

    categories.forEach((category, categoryIndex) => {
      if (categoryIds.has(category.id)) {
        ctx.addIssue({
          code: "custom",
          path: [categoryIndex, "id"],
          message: `duplicate mechanic category id: ${category.id}`,
        });
      }
      categoryIds.add(category.id);

      category.rules.forEach((rule, ruleIndex) => {
        if (ruleIds.has(rule.id)) {
          ctx.addIssue({
            code: "custom",
            path: [categoryIndex, "rules", ruleIndex, "id"],
            message: `duplicate mechanic rule id: ${rule.id}`,
          });
        }
        ruleIds.add(rule.id);
      });
    });
  });

export type MechanicalEffectType = z.infer<typeof mechanicalEffectTypeSchema>;
export type EffectTargeting = z.infer<typeof effectTargetingSchema>;
export type CostRuleReference = z.infer<typeof costRuleReferenceSchema>;
export type CanonicalMechanicalEffect = z.infer<typeof mechanicalEffectSchema>;
export type SystemMechanicsConfig = z.infer<typeof systemMechanicsConfigSchema>;

export type MechanicalCostIssue = {
  effectId: string;
  reference: CostRuleReference;
  code: "duplicate_cost_reference" | "unknown_cost_reference";
};

export type MechanicalCostBreakdown = {
  effectId: string;
  mechanicId: string;
  ruleId: string;
  ruleName: string;
  cost: number;
};

export type MechanicalCostResult = {
  valid: boolean;
  total: number | null;
  breakdown: MechanicalCostBreakdown[];
  issues: MechanicalCostIssue[];
};

export type PersistedEffectsValidation = {
  valid: boolean;
  canonicalEffects: CanonicalMechanicalEffect[];
  legacyEffects: unknown[];
  errors: Array<{ index: number; error: z.ZodError }>;
};

export function validatePersistedMechanicalEffects(
  effects: unknown[],
): PersistedEffectsValidation {
  const canonicalEffects: CanonicalMechanicalEffect[] = [];
  const legacyEffects: unknown[] = [];
  const errors: Array<{ index: number; error: z.ZodError }> = [];

  effects.forEach((effect, index) => {
    const isCanonicalCandidate =
      typeof effect === "object" && effect !== null && "id" in effect;
    if (!isCanonicalCandidate) {
      legacyEffects.push(effect);
      return;
    }

    const parsed = mechanicalEffectSchema.safeParse(effect);
    if (parsed.success) canonicalEffects.push(parsed.data);
    else errors.push({ index, error: parsed.error });
  });

  return {
    valid: errors.length === 0,
    canonicalEffects,
    legacyEffects,
    errors,
  };
}

export function calculateCanonicalMechanicalCost(
  effects: CanonicalMechanicalEffect[],
  categories: SystemMechanicsConfig,
): MechanicalCostResult {
  const breakdown: MechanicalCostBreakdown[] = [];
  const issues: MechanicalCostIssue[] = [];

  for (const effect of effects) {
    const seen = new Set<string>();

    for (const reference of effect.costRules) {
      const referenceKey = `${reference.mechanicId}:${reference.ruleId}`;
      if (seen.has(referenceKey)) {
        issues.push({
          effectId: effect.id,
          reference,
          code: "duplicate_cost_reference",
        });
        continue;
      }
      seen.add(referenceKey);

      const category = categories.find(
        (candidate) => candidate.id === reference.mechanicId,
      );
      const rule = category?.rules.find(
        (candidate) => candidate.id === reference.ruleId,
      );

      if (!category || !rule) {
        issues.push({
          effectId: effect.id,
          reference,
          code: "unknown_cost_reference",
        });
        continue;
      }

      breakdown.push({
        effectId: effect.id,
        mechanicId: category.id,
        ruleId: rule.id,
        ruleName: rule.name,
        cost: rule.cost,
      });
    }
  }

  return {
    valid: issues.length === 0,
    total:
      issues.length === 0
        ? breakdown.reduce((sum, entry) => sum + entry.cost, 0)
        : null,
    breakdown,
    issues,
  };
}

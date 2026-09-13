import { z } from "zod";
import { ruleComponentSchema, type RuleComponent } from "./ruleComponents";

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
  "cost_adjustment",
  "manual_resolution",
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

export const effectResolutionSchema = z.enum(["none", "eva", "cor", "rd", "opposed"]);

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

const durationSchema = z.strictObject({
  value: z.number().int().positive(),
  unit: z.enum(["turn", "round", "scene"]),
});

const baseEffectShape = {
  id: z.string().min(1),
  timing: effectTimingSchema,
  targeting: effectTargetingSchema,
  costRules: z.array(costRuleReferenceSchema).default([]),
  duration: durationSchema.optional(),
  resolution: effectResolutionSchema.optional(),
};

const effectDefinitionBaseShape = {
  timing: effectTimingSchema,
  duration: durationSchema.optional(),
};

export const mechanicalEffectDefinitionSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("cost_adjustment"), scopeId: z.string().min(1), amount: z.number() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("manual_resolution"), message: z.string().min(1) }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("attribute_modifier"), attributeId: z.string().min(1), amount: z.number() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("derived_stat_modifier"), statId: z.string().min(1), amount: z.number() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("damage"), dice: z.string().min(1) }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("healing"), resourceId: z.enum(["SA", "ES"]), amount: z.number().positive() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("barrier"), amount: z.number().positive() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("status"), statusElementId: z.string().min(1) }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("currency"), currencyId: z.enum(["yen", "exp"]), amount: z.number().int(), frequencyRuleId: z.string().min(1).optional() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("rule_override"), ruleId: z.string().min(1) }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("choice"), options: z.array(z.string().min(1)).min(1) }),
]);

export const mechanicalEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...baseEffectShape, type: z.literal("cost_adjustment"), scopeId: z.string().min(1), amount: z.number() }),
  z.strictObject({ ...baseEffectShape, type: z.literal("manual_resolution"), message: z.string().min(1) }),
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
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("status"),
    statusElementId: z.string().min(1),
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

export const appliedMechanicReferenceSchema = z.strictObject({
  applicationId: z.string().min(1),
  groupId: z.string().min(1).optional(),
  mechanicId: z.string().min(1),
  ruleId: z.string().min(1),
});

export const appliedMechanicReferencesSchema = z.array(appliedMechanicReferenceSchema);

export const staminaExecutionCostsSchema = z.strictObject({
  baseAction: z.number().int().nonnegative(),
  objectUse: z.number().int().nonnegative(),
  techniqueByLevel: z.array(z.strictObject({ level: z.number().int().positive(), cost: z.number().int().nonnegative() })),
  skillByLevel: z.array(z.strictObject({ level: z.number().int().positive(), cost: z.number().int().nonnegative() })),
});

const mechanicRuleSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    cost: z.number().finite(),
    mechDesc: z.string().optional(),
    ruleType: z.enum(["effect", "cost_modifier", "component"]).default("cost_modifier"),
    effect: mechanicalEffectDefinitionSchema.optional(),
    component: ruleComponentSchema.optional(),
  })
  .passthrough()
  .superRefine((rule, ctx) => {
    if ((rule.ruleType === "component") !== (rule.component !== undefined) || (rule.ruleType === "component" && rule.effect)) ctx.addIssue({ code: "custom", message: "Invalid rule component" });
    if (rule.ruleType === "effect" && !rule.effect) {
      ctx.addIssue({ code: "custom", path: ["effect"], message: "an effect rule must define executable behavior" });
    }
    if (rule.ruleType === "cost_modifier" && rule.effect) {
      ctx.addIssue({ code: "custom", path: ["effect"], message: "a cost modifier cannot define executable behavior" });
    }
    if (rule.ruleType === "effect" && rule.effect?.timing === "passive" && rule.cost !== 0) {
      ctx.addIssue({ code: "custom", path: ["cost"], message: "passive mechanics cannot consume Stamina" });
    }
  });

const mechanicCategorySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    coreKey: z.string().min(1).optional(),
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
    targeting: effectTargetingSchema.optional(),
    defaultResolution: effectResolutionSchema.optional(),
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
export type MechanicalEffectDefinition = z.infer<typeof mechanicalEffectDefinitionSchema>;
export type AppliedMechanicReference = z.infer<typeof appliedMechanicReferenceSchema>;
export type StaminaExecutionCosts = z.infer<typeof staminaExecutionCostsSchema>;
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
  appliedMechanics: AppliedMechanicReference[];
};

export function validatePersistedMechanicalEffects(
  effects: unknown[],
): PersistedEffectsValidation {
  const canonicalEffects: CanonicalMechanicalEffect[] = [];
  const legacyEffects: unknown[] = [];
  const errors: Array<{ index: number; error: z.ZodError }> = [];
  const appliedMechanics: AppliedMechanicReference[] = [];

  effects.forEach((effect, index) => {
    const applied = appliedMechanicReferenceSchema.safeParse(effect);
    if (applied.success) {
      appliedMechanics.push(applied.data);
      return;
    }
    if (typeof effect === "object" && effect !== null && "applicationId" in effect) {
      errors.push({ index, error: applied.error });
      return;
    }
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
    appliedMechanics,
  };
}

export type AppliedMechanicsResolution = {
  valid: boolean;
  effects: CanonicalMechanicalEffect[];
  groups: ResolvedRuleGroup[];
  staminaCost: number | null;
  breakdown: MechanicalCostBreakdown[];
  issues: Array<{ applicationId: string; mechanicId: string; ruleId: string; code: "duplicate_mechanic_reference" | "unknown_mechanic_reference" | "conflicting_components" }>;
};

/** Resolves element references against the current global rule set. Element records
 * never copy behavior, targeting or CE; system mechanics remain authoritative. */
export function resolveAppliedMechanics(
  references: AppliedMechanicReference[],
  categories: SystemMechanicsConfig,
): AppliedMechanicsResolution {
  const breakdown: MechanicalCostBreakdown[] = [];
  const issues: AppliedMechanicsResolution["issues"] = [];
  const groups = new Map<string, ResolvedRuleGroup>();
  const seen = new Set<string>();
  const applicationIds = new Set<string>();
  for (const reference of references) {
    const groupId = reference.groupId ?? 'default';
    const key = JSON.stringify([groupId, reference.mechanicId, reference.ruleId]);
    if (seen.has(key) || applicationIds.has(reference.applicationId)) {
      issues.push({ ...reference, code: 'duplicate_mechanic_reference' });
      continue;
    }
    seen.add(key); applicationIds.add(reference.applicationId);
    const category = categories.find(c => c.id === reference.mechanicId);
    const rule = category?.rules.find(r => r.id === reference.ruleId);
    if (!category || !rule) { issues.push({ ...reference, code: 'unknown_mechanic_reference' }); continue; }
    const group = groups.get(groupId) ?? { id: groupId, effects: [], components: [], references: [], cost: 0 };
    groups.set(groupId, group);
    group.references.push(reference);
    const cost = rule.effect?.timing === 'passive' ? 0 : rule.cost;
    group.cost += cost;
    breakdown.push({ effectId: reference.applicationId, mechanicId: category.id, ruleId: rule.id, ruleName: rule.name, cost });
    if (rule.component) {
      const repeatable = ['condition', 'consequence', 'usage', 'cap'].includes(rule.component.kind);
      const duplicate = group.components.some(c => c.kind === rule.component!.kind && (!repeatable || c.kind === 'usage' && rule.component!.kind === 'usage' && c.period === rule.component!.period || c.kind === 'cap' && rule.component!.kind === 'cap' && c.subject === rule.component!.subject));
      if (duplicate) issues.push({ ...reference, code: 'conflicting_components' });
      group.components.push(rule.component);
    }
    if (rule.ruleType === 'effect' && rule.effect) {
      const targeting = category.targeting ?? category.defaultTargeting ?? legacyCategoryTargeting(category.defaultTarget);
      group.effects.push({ id: reference.applicationId, costRules: [], targeting, resolution: category.defaultResolution ?? 'none', ...rule.effect } as CanonicalMechanicalEffect);
    }
  }
  for (const group of groups.values()) {
    const activation = group.components.find(c => c.kind === 'activation');
    const target = group.components.find(c => c.kind === 'target');
    const count = group.components.find(c => c.kind === 'target_count');
    const area = group.components.find(c => c.kind === 'area');
    const duration = group.components.find(c => c.kind === 'duration');
    if ((target?.self && !target.allies && !target.enemies && (area || count && count.max !== 1)) || (duration?.duration.mode === 'while_condition' && !group.components.some(c => c.kind === 'condition')) || (activation?.passive && group.components.some(c => c.kind === 'consequence' || c.kind === 'maintenance' || c.kind === 'usage' || c.kind === 'cooldown'))) issues.push({ ...group.references[0], code: 'conflicting_components' });
    if (activation?.passive || group.effects.length > 0 && group.effects.every(e => e.timing === 'passive')) group.cost = 0;
    if (activation?.passive && group.effects.some(e => ['damage', 'healing', 'barrier', 'currency'].includes(e.type))) issues.push({ ...group.references[0], code: 'conflicting_components' });
    group.effects = group.effects.map(effect => ({ ...effect,
      timing: activation?.passive ? 'passive' : effect.timing,
      ...(duration ? { duration: duration.duration.mode === 'turns' ? { value: duration.duration.turns, unit: 'turn' as const } : undefined } : {}),
      targeting: { ...effect.targeting,
        ...(target ? { relationship: target.self && !target.allies && !target.enemies ? 'self' as const : target.allies && !target.self && !target.enemies ? 'ally' as const : target.enemies && !target.self && !target.allies ? 'enemy' as const : 'any' as const } : {}),
        ...(count ? { minTargets: count.min, maxTargets: count.max } : {}),
        ...(area ? { selection: 'area' as const, ...(!count ? { maxTargets: null } : {}) } : {}),
      },
    }));
  }
  for (const group of groups.values()) {
    if (group.effects.some(e => !effectTargetingSchema.safeParse(e.targeting).success)) issues.push({ ...group.references[0], code: 'conflicting_components' });
    const hasContinuous = group.components.some(c => c.kind === 'duration' && c.duration.mode !== 'instant');
    if (!hasContinuous && group.components.some(c => c.kind === 'maintenance' || c.kind === 'consequence' && (c.when === 'each_turn' || c.consequence.kind === 'attribute' && c.consequence.untilEnd))) issues.push({ ...group.references[0], code: 'conflicting_components' });
  }
  const resolvedGroups = [...groups.values()];
  return { valid: issues.length === 0, groups: resolvedGroups,
    effects: issues.length ? [] : resolvedGroups.flatMap(g => g.effects),
    staminaCost: issues.length ? null : resolvedGroups.reduce((sum, g) => sum + g.cost, 0), breakdown, issues };
}

export type ResolvedRuleGroup = {
  id: string;
  effects: CanonicalMechanicalEffect[];
  components: RuleComponent[];
  references: AppliedMechanicReference[];
  cost: number;
};

function legacyCategoryTargeting(relationship: "self" | "enemy" | "ally" | "any" | undefined): EffectTargeting {
  const resolved = relationship ?? "self";
  return {
    allowedEntityKinds: ["character", "npc"],
    relationship: resolved,
    selection: "direct",
    minTargets: 1,
    maxTargets: 1,
  };
}

export type MechanicalExecutionContext = "action" | "object" | "technique" | "skill";

export function calculateExecutionStaminaCost(
  references: AppliedMechanicReference[],
  categories: SystemMechanicsConfig,
  policy: StaminaExecutionCosts,
  context: MechanicalExecutionContext,
  level?: number,
): number | null {
  const resolution = resolveAppliedMechanics(references, categories);
  if (!resolution.valid) return null;
  if (resolution.groups.length > 0 && resolution.groups.every(g => g.components.some(c => c.kind === "activation" && c.passive) || g.effects.length > 0 && g.effects.every(e => e.timing === "passive"))) return 0;
  const base = context === "action" ? policy.baseAction
    : context === "object" ? policy.objectUse
    : context === "technique" ? policy.techniqueByLevel.find(item => item.level === level)?.cost
    : policy.skillByLevel.find(item => item.level === level)?.cost;
  if (base === undefined) return null;
  const scopeKey: "objects" | "actions" | "techniques" = context === "object" ? "objects" : context === "action" ? "actions" : "techniques";
  const mechanicCost = references.reduce((sum, reference) => {
    const category = categories.find(item => item.id === reference.mechanicId);
    const rule = category?.rules.find(item => item.id === reference.ruleId);
    if (!category || !rule || !category.scope[scopeKey]) return sum;
    if (rule.ruleType === "effect" && rule.effect?.timing === "passive") return sum;
    return sum + rule.cost;
  }, 0);
  return Math.max(base, mechanicCost);
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

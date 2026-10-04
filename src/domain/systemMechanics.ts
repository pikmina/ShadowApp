import { z } from "zod";
import { ruleComponentSchema, type RuleComponent } from "./ruleComponents";
import { createCoreCategories } from "./coreRuleCatalog";

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
  "transformation",
  "object_manipulation",
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
  /** @deprecated Legacy field. Execution timing/conditions belong to MechanicalBehavior in Catalog. */
  timing: effectTimingSchema.optional(),
  targeting: effectTargetingSchema,
  costRules: z.array(costRuleReferenceSchema).default([]),
  duration: durationSchema.optional(),
  resolution: effectResolutionSchema.optional(),
};

const effectDefinitionBaseShape = {
  /** @deprecated Legacy field. Execution timing/conditions belong to MechanicalBehavior in Catalog. */
  timing: effectTimingSchema.optional(),
  duration: durationSchema.optional(),
};

export const mechanicalEffectDefinitionSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("cost_adjustment"), scopeId: z.string().min(1), amount: z.number() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("manual_resolution"), message: z.string().min(1) }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("attribute_modifier"), attributeId: z.string().min(1), amount: z.number() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("derived_stat_modifier"), statId: z.string().min(1), amount: z.number() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("damage"), dice: z.string().min(1) }),
  z.strictObject({
    ...effectDefinitionBaseShape,
    type: z.literal("healing"),
    resourceId: z.enum(["SA", "ES"]).default("SA"),
    kind: z.enum(["fixed", "dice"]).optional(),
    amount: z.number().positive().optional(),
    dice: z.string().min(1).optional(),
    formula: z.string().min(1).optional(),
    magnitude: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("fixed"), amount: z.number().positive() }),
        z.object({ kind: z.literal("dice"), formula: z.string().min(1) }),
      ])
      .optional(),
  }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("barrier"), amount: z.number().positive() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("status"), statusElementId: z.string().min(1) }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("currency"), currencyId: z.enum(["yen", "exp"]), amount: z.number().int(), frequencyRuleId: z.string().min(1).optional() }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("rule_override"), ruleId: z.string().min(1) }),
  z.strictObject({ ...effectDefinitionBaseShape, type: z.literal("choice"), options: z.array(z.string().min(1)).min(1) }),
  z.strictObject({
    ...effectDefinitionBaseShape,
    type: z.literal("transformation"),
    magnitude: z
      .object({
        type: z.string().default("corporal"),
        value: z.number().default(1),
      })
      .optional(),
  }),
  z.strictObject({
    ...effectDefinitionBaseShape,
    type: z.literal("object_manipulation"),
    size: z.enum(["small", "medium", "large", "huge"]).optional(),
    maxDimension: z.string().optional(),
  }),
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
    resourceId: z.enum(["SA", "ES"]).default("SA"),
    kind: z.enum(["fixed", "dice"]).optional(),
    amount: z.number().positive().optional(),
    dice: z.string().min(1).optional(),
    formula: z.string().min(1).optional(),
    magnitude: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("fixed"), amount: z.number().positive() }),
        z.object({ kind: z.literal("dice"), formula: z.string().min(1) }),
      ])
      .optional(),
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
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("transformation"),
    magnitude: z
      .object({
        type: z.string().default("corporal"),
        value: z.number().default(1),
      })
      .optional(),
  }),
  z.strictObject({
    ...baseEffectShape,
    type: z.literal("object_manipulation"),
    size: z.enum(["small", "medium", "large", "huge"]).optional(),
    maxDimension: z.string().optional(),
  }),
]);

export const canonicalMechanicalEffectsSchema = z.array(mechanicalEffectSchema);

export const appliedMechanicReferenceSchema = z.strictObject({
  applicationId: z.string().min(1),
  groupId: z.string().min(1).optional(),
  mechanicId: z.string().min(1),
  ruleId: z.string().min(1),
  minLevel: z.number().int().positive().optional(),
});

export const appliedMechanicReferencesSchema = z.array(appliedMechanicReferenceSchema);

export const supportDifficultyTierSchema = z.strictObject({
  maxCost: z.number().int().nonnegative(),
  difficultyId: z.string().optional(),
  difficultyName: z.string().optional(),
  rd: z.number().int().positive().optional(),
});

export type SupportDifficultyTier = z.infer<typeof supportDifficultyTierSchema>;

export const DEFAULT_SUPPORT_DIFFICULTY_TIERS: SupportDifficultyTier[] = [
  { maxCost: 3, difficultyId: "normal", difficultyName: "Normal", rd: 12 },
  { maxCost: 6, difficultyId: "complicated", difficultyName: "Complicado", rd: 16 },
  { maxCost: 10, difficultyId: "hard", difficultyName: "Difícil", rd: 20 },
  { maxCost: 999999, difficultyId: "very_hard", difficultyName: "Muy Difícil", rd: 24 },
];

export const staminaExecutionCostsSchema = z.strictObject({
  baseAction: z.number().int().nonnegative(),
  objectUse: z.number().int().nonnegative(),
  minTechniqueCost: z.number().int().nonnegative().optional(),
  techniqueByLevel: z.array(z.strictObject({ level: z.number().int().positive(), cost: z.number().int().nonnegative() })),
  skillByLevel: z.array(z.strictObject({ level: z.number().int().positive(), cost: z.number().int().nonnegative() })),
  supportDifficulty: z.array(supportDifficultyTierSchema).optional(),
});

function resolveTierRD(
  tier: SupportDifficultyTier | undefined,
  systemDifficulties?: Array<{ id: string; rd: number; name?: string }>
): number {
  if (!tier) return 24;
  if (typeof tier.rd === "number" && tier.rd > 0) return tier.rd;
  const rawId = (tier.difficultyId || "").trim();
  const rawName = (tier.difficultyName || "").trim();

  if (systemDifficulties && systemDifficulties.length > 0) {
    const match = systemDifficulties.find(
      (d) =>
        (rawId && (d.id === rawId || d.id.toLowerCase() === rawId.toLowerCase() || (d.name && d.name.toLowerCase() === rawId.toLowerCase()))) ||
        (rawName && (d.id === rawName || d.id.toLowerCase() === rawName.toLowerCase() || (d.name && d.name.toLowerCase() === rawName.toLowerCase())))
    );
    if (match && typeof match.rd === "number" && match.rd > 0) return match.rd;
  }

  const raw = (rawId || rawName).toLowerCase();
  if (raw === "normal" || raw === "rd_1789241947698") return 12;
  if (raw === "complicado" || raw === "complicated" || raw === "rd_1789241955608") return 16;
  if (raw === "difícil" || raw === "dificil" || raw === "hard" || raw === "rd_1789241967097") return 20;
  if (raw === "muy difícil" || raw === "muy dificil" || raw === "very_hard" || raw === "rd_1789241979874") return 24;
  if (raw === "extremo" || raw === "extreme" || raw === "rd_1789241990811") return 28;
  if (raw === "fácil" || raw === "facil" || raw === "easy") return 9;
  return 24;
}

/**
 * Pure canonical helper: calculates the Support/Defense Rango de Dificultad (RD)
 * from the Technique's structural calculated stamina cost and the System Rule tiers.
 *
 * Default rules:
 * - Cost <= 3  -> RD 12 (Normal)
 * - Cost <= 6  -> RD 16 (Complicado)
 * - Cost <= 10 -> RD 20 (Difícil)
 * - Cost > 10  -> RD 24 (Muy Difícil)
 */
export function deriveSupportDefenseRD(
  structuralCost: number,
  tiers: SupportDifficultyTier[] = DEFAULT_SUPPORT_DIFFICULTY_TIERS,
  systemDifficulties?: Array<{ id: string; rd: number; name?: string }>
): number {
  const normalizedCost = Math.max(0, structuralCost);
  const activeTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_SUPPORT_DIFFICULTY_TIERS;
  const sorted = [...activeTiers].sort((a, b) => a.maxCost - b.maxCost);
  for (const tier of sorted) {
    if (normalizedCost <= tier.maxCost) {
      return resolveTierRD(tier, systemDifficulties);
    }
  }
  const lastTier = sorted[sorted.length - 1];
  return resolveTierRD(lastTier, systemDifficulties);
}

export type HealingOptionResult = {
  id: string;
  name: string;
  cost: number;
  runtimeKey: string;
  kind: "fixed" | "dice";
  amount?: number;
  formula?: string;
  dice?: string;
  magnitude: { kind: "fixed"; amount: number } | { kind: "dice"; formula: string };
  resourceId?: string;
  ruleId?: string;
};

export type ValidHealingOption = {
  kind: "fixed" | "dice";
  amount?: number;
  formula?: string;
  dice?: string;
  magnitude: { kind: "fixed"; amount: number } | { kind: "dice"; formula: string };
  cost: number;
  ruleId: string;
  name: string;
  runtimeKey: string;
  label: string;
  isAvailable?: boolean;
};

function parseHealingRule(r: any): {
  kind: "fixed" | "dice";
  amount?: number;
  formula?: string;
  resourceId?: string;
  magnitude: { kind: "fixed"; amount: number } | { kind: "dice"; formula: string };
} | undefined {
  const eff = r.effect;
  const res = eff?.resourceId;

  if (eff?.magnitude?.kind === "dice" && eff.magnitude.formula) {
    const f = String(eff.magnitude.formula).toUpperCase();
    return { kind: "dice", formula: f, resourceId: res, magnitude: { kind: "dice", formula: f } };
  }
  if (eff?.magnitude?.kind === "fixed" && typeof eff.magnitude.amount === "number") {
    return { kind: "fixed", amount: eff.magnitude.amount, resourceId: res, magnitude: { kind: "fixed", amount: eff.magnitude.amount } };
  }
  if (eff?.kind === "dice" || eff?.dice || eff?.formula) {
    const f = String(eff.formula || eff.dice).toUpperCase();
    return { kind: "dice", formula: f, resourceId: res, magnitude: { kind: "dice", formula: f } };
  }
  if (typeof eff?.amount === "number" && eff.amount > 0) {
    return { kind: "fixed", amount: eff.amount, resourceId: res, magnitude: { kind: "fixed", amount: eff.amount } };
  }

  // Fallback to runtimeKey, ruleId suffix, or rule name
  const rk = (r.runtimeKey || r.id?.split(".").pop() || "").trim();
  const diceMatch = rk.match(/([1-9]\d*[dD]\d+)/i) || r.name?.match(/([1-9]\d*[dD]\d+)/i);
  if (diceMatch) {
    const f = diceMatch[1].toUpperCase();
    return { kind: "dice", formula: f, resourceId: res, magnitude: { kind: "dice", formula: f } };
  }

  const numMatch = rk.match(/^(?:hp|es)?(\d+)$/i) || r.name?.match(/\b(\d+)\b/);
  if (numMatch) {
    const amt = parseInt(numMatch[1], 10);
    if (amt > 0) {
      return { kind: "fixed", amount: amt, resourceId: res, magnitude: { kind: "fixed", amount: amt } };
    }
  }

  return undefined;
}

function buildHealingOptionResult(r: any, parsed: NonNullable<ReturnType<typeof parseHealingRule>>): HealingOptionResult {
  const runtimeKey = (r as any).runtimeKey || (parsed.kind === "dice" ? parsed.formula! : String(parsed.amount!));
  return {
    id: r.id,
    name: r.name,
    cost: typeof r.cost === "number" ? r.cost : 0,
    runtimeKey,
    kind: parsed.kind,
    amount: parsed.amount,
    formula: parsed.formula,
    dice: parsed.formula,
    magnitude: parsed.magnitude,
  };
}

/**
 * Finds a healing option in the system mechanics configuration matching the given amount/formula/effect and optional resource.
 */
export function findHealingOption(
  categories: SystemMechanicsConfig = [],
  query:
    | number
    | string
    | {
        id?: string;
        ruleId?: string;
        runtimeKey?: string;
        amount?: number;
        formula?: string;
        dice?: string;
        kind?: "fixed" | "dice";
        magnitude?: { kind: "fixed"; amount: number } | { kind: "dice"; formula: string };
      },
  resourceId?: string
): HealingOptionResult | undefined {
  if (query === undefined || query === null) return undefined;
  const cat = categories.find(c => c.id === "healing" || c.coreKey === "healing" || c.id === "core.healing");
  if (!cat || !Array.isArray(cat.rules)) return undefined;

  let queryRuleId: string | undefined;
  let queryRuntimeKey: string | undefined;
  let queryAmount: number | undefined;
  let queryFormula: string | undefined;
  let queryKind: "fixed" | "dice" | undefined;

  if (typeof query === "number") {
    if (isNaN(query) || query <= 0) return undefined;
    queryAmount = query;
    queryKind = "fixed";
  } else if (typeof query === "string") {
    const trimmed = query.trim();
    if (!trimmed) return undefined;
    if (/^\d+[dD]\d+$/i.test(trimmed)) {
      queryFormula = trimmed.toUpperCase();
      queryKind = "dice";
    } else if (/^\d+$/.test(trimmed)) {
      queryAmount = parseInt(trimmed, 10);
      queryKind = "fixed";
    } else {
      queryRuleId = trimmed;
      queryRuntimeKey = trimmed;
      const diceMatch = trimmed.match(/([1-9]\d*[dD]\d+)/i);
      if (diceMatch) {
        queryFormula = diceMatch[1].toUpperCase();
        queryKind = "dice";
      }
    }
  } else if (typeof query === "object") {
    queryRuleId = query.ruleId || query.id;
    queryRuntimeKey = query.runtimeKey;
    if (query.magnitude?.kind === "dice") {
      queryKind = "dice";
      queryFormula = query.magnitude.formula?.toUpperCase();
    } else if (query.magnitude?.kind === "fixed") {
      queryKind = "fixed";
      queryAmount = query.magnitude.amount;
    }
    if (!queryFormula && (query.formula || query.dice)) {
      queryKind = "dice";
      queryFormula = (query.formula || query.dice)!.toUpperCase();
    }
    if (queryAmount === undefined && typeof query.amount === "number" && query.amount > 0) {
      if (queryKind !== "dice") {
        queryKind = "fixed";
        queryAmount = query.amount;
      }
    }
  }

  const resLower = resourceId?.toLowerCase();
  const resPrefix = resLower === "es" ? "es" : "hp";

  for (const r of cat.rules) {
    const parsed = parseHealingRule(r);
    if (!parsed) continue;

    // Resource filtering: if rule specifies a resourceId, it must match
    if (parsed.resourceId && resourceId && parsed.resourceId.toUpperCase() !== resourceId.toUpperCase()) {
      continue;
    }

    const rk = ((r as any).runtimeKey || r.id.split(".").pop() || "").toLowerCase();
    const idLower = r.id.toLowerCase();

    // 1. Direct ruleId or runtimeKey match
    if (queryRuleId && (r.id === queryRuleId || idLower === queryRuleId.toLowerCase())) {
      return buildHealingOptionResult(r, parsed);
    }
    if (queryRuntimeKey && (rk === queryRuntimeKey.toLowerCase() || (r as any).runtimeKey === queryRuntimeKey)) {
      return buildHealingOptionResult(r, parsed);
    }

    // 2. Kind-specific match
    if (queryKind === "dice" && parsed.kind === "dice") {
      if (queryFormula && parsed.formula && queryFormula === parsed.formula) {
        return buildHealingOptionResult(r, parsed);
      }
    } else if (queryKind === "fixed" && parsed.kind === "fixed") {
      if (queryAmount !== undefined && parsed.amount !== undefined && queryAmount === parsed.amount) {
        return buildHealingOptionResult(r, parsed);
      }
    }

    // 3. Fallback candidates for numeric query
    if (queryAmount !== undefined && parsed.kind === "fixed") {
      const candidates = [
        String(queryAmount),
        `${resPrefix}${queryAmount}`,
        `${resLower}${queryAmount}`,
      ];
      if (candidates.includes(rk) || candidates.includes(idLower.split(".").pop() || "") || r.name.trim() === String(queryAmount)) {
        return buildHealingOptionResult(r, parsed);
      }
    }
  }

  return undefined;
}

/**
 * Returns all configured discrete healing options from system mechanics.
 */
export function getValidHealingOptions(
  categories: SystemMechanicsConfig = [],
  resourceId?: string
): ValidHealingOption[] {
  const cat = categories.find(c => c.id === "healing" || c.coreKey === "healing" || c.id === "core.healing");
  if (!cat || !Array.isArray(cat.rules)) return [];

  const results: ValidHealingOption[] = [];
  const seenKeys = new Set<string>();

  for (const r of cat.rules) {
    const parsed = parseHealingRule(r);
    if (!parsed) continue;

    if (parsed.resourceId && resourceId && parsed.resourceId.toUpperCase() !== resourceId.toUpperCase()) {
      continue;
    }

    const cost = typeof r.cost === "number" ? r.cost : 0;
    const runtimeKey = (r as any).runtimeKey || (parsed.kind === "dice" ? parsed.formula! : String(parsed.amount!));
    const dedupKey = `${parsed.kind}:${parsed.kind === "dice" ? parsed.formula : parsed.amount}:${cost}`;

    if (!seenKeys.has(dedupKey)) {
      seenKeys.add(dedupKey);
      const displayVal = parsed.kind === "dice" ? parsed.formula : String(parsed.amount);
      const costLabel = cost > 0 ? `+${cost} CE` : `${cost} CE`;
      results.push({
        kind: parsed.kind,
        amount: parsed.amount,
        formula: parsed.formula,
        dice: parsed.formula,
        magnitude: parsed.magnitude,
        cost,
        ruleId: r.id,
        name: r.name,
        runtimeKey,
        label: `${displayVal} (${costLabel})`,
        isAvailable: r.isAvailable !== false,
      });
    }
  }

  return results.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "fixed" ? -1 : 1;
    }
    if (a.kind === "fixed" && b.kind === "fixed") {
      return (a.amount ?? 0) - (b.amount ?? 0);
    }
    return (a.formula ?? "").localeCompare(b.formula ?? "");
  });
}

/**
 * Extracts the numeric barrier amount from a barrier rule or option view.
 */
export function getBarrierAmount(opt: { id?: string; runtimeKey?: string; name?: string; effect?: any }): number {
  if (opt.effect && typeof opt.effect.amount === 'number' && opt.effect.amount > 0) return opt.effect.amount;
  if (opt.runtimeKey) {
    const parsed = parseInt(opt.runtimeKey, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (opt.id) {
    const suffix = opt.id.split('.').pop() || '';
    const parsed = parseInt(suffix, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (opt.name) {
    const match = opt.name.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

export interface ConfiguredOptionResult {
  ruleId: string;
  name: string;
  cost: number;
  runtimeKey: string;
  kind?: string;
  amount?: number;
  formula?: string;
  dice?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export function findDamageOption(
  categories: SystemMechanicsConfig = [],
  diceFormula?: string | number
): ConfiguredOptionResult | undefined {
  if (diceFormula === undefined || diceFormula === null || diceFormula === '') return undefined;
  const str = String(diceFormula).trim();
  if (!str) return undefined;
  const norm = str.toUpperCase();
  const cat = categories.find(c => c.id === 'damage' || c.coreKey === 'damage' || c.id === 'core.damage');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey?.toUpperCase() === norm ||
    (r as any).effect?.dice?.toUpperCase() === norm ||
    (r as any).effect?.formula?.toUpperCase() === norm ||
    String((r as any).effect?.amount) === norm ||
    r.name.toUpperCase() === norm ||
    r.id.toUpperCase().endsWith(`.${norm}`)
  );
  if (!rule) return undefined;
  const isDice = isNaN(Number(norm));
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || norm,
    dice: isDice ? norm : undefined,
    formula: isDice ? norm : undefined,
    amount: !isDice ? parseInt(norm, 10) : undefined,
    kind: isDice ? 'dice' : 'fixed'
  };
}

export function findDamageTypeOption(
  categories: SystemMechanicsConfig = [],
  damageType?: string
): ConfiguredOptionResult | undefined {
  if (!damageType || typeof damageType !== 'string') return undefined;
  const norm = damageType.trim().toLowerCase();
  const cat = categories.find(c => c.id === 'damage_type' || c.coreKey === 'damage_type' || c.id === 'core.damage_type');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey?.toLowerCase() === norm ||
    r.id.toLowerCase().endsWith(`.${norm}`) ||
    r.name.toLowerCase() === norm
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || norm,
    kind: 'fixed'
  };
}

export function findBarrierOption(
  categories: SystemMechanicsConfig = [],
  amount?: number | string
): ConfiguredOptionResult | undefined {
  if (amount === undefined || amount === null || amount === '') return undefined;
  const num = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
  if (isNaN(num) || num <= 0) return undefined;
  const cat = categories.find(c => c.id === 'barrier' || c.coreKey === 'barrier' || c.id === 'core.barrier');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    getBarrierAmount(r) === num ||
    (r as any).effect?.amount === num ||
    (r as any).runtimeKey === String(num) ||
    r.id.endsWith(`.${num}`)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || String(num),
    amount: num,
    kind: 'fixed'
  };
}

export function findNumericModifierOption(
  categories: SystemMechanicsConfig = [],
  amount?: number | string
): ConfiguredOptionResult | undefined {
  if (amount === undefined || amount === null || amount === '') return undefined;
  const num = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
  if (isNaN(num)) return undefined;
  const cat = categories.find(c => c.id === 'numeric_modifier' || c.coreKey === 'numeric_modifier' || c.id === 'core.numeric_modifier');
  if (!cat || !cat.rules) return undefined;
  const strVal = String(num);
  const signStrVal = num > 0 ? `+${num}` : String(num);
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey === strVal ||
    (r as any).runtimeKey === signStrVal ||
    (r as any).effect?.amount === num ||
    (r as any).component?.amount === num ||
    r.id.endsWith(`.${strVal}`) ||
    r.id.endsWith(`.${signStrVal}`)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || strVal,
    amount: num,
    kind: 'fixed'
  };
}

export function findBonusOption(
  categories: SystemMechanicsConfig = [],
  amount?: number | string
): ConfiguredOptionResult | undefined {
  return findNumericModifierOption(categories, amount);
}

export function findPenaltyOption(
  categories: SystemMechanicsConfig = [],
  amount?: number | string
): ConfiguredOptionResult | undefined {
  return findNumericModifierOption(categories, amount);
}

export function findStatOption(
  categories: SystemMechanicsConfig = [],
  statId?: string
): ConfiguredOptionResult | undefined {
  if (!statId) return undefined;
  const normalizedKey = String(statId).trim().toUpperCase();
  const cat = categories.find(c => c.id === 'derived_stat' || c.coreKey === 'derived_stat' || c.id === 'core.derived_stat');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey?.toUpperCase() === normalizedKey ||
    r.id?.toUpperCase().endsWith(`.${normalizedKey}`) ||
    (r as any).effect?.statId?.toUpperCase() === normalizedKey ||
    r.name?.toUpperCase().includes(normalizedKey)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || normalizedKey,
    kind: 'fixed'
  };
}

export function findAttributeOption(
  categories: SystemMechanicsConfig = [],
  attributeId?: string
): ConfiguredOptionResult | undefined {
  if (!attributeId) return undefined;
  const normalizedKey = String(attributeId).trim().toUpperCase();
  const cat = categories.find(c => c.id === 'attribute' || c.coreKey === 'attribute' || c.id === 'core.attribute');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey?.toUpperCase() === normalizedKey ||
    r.id?.toUpperCase().endsWith(`.${normalizedKey}`) ||
    (r as any).effect?.attributeId?.toUpperCase() === normalizedKey ||
    r.name?.toUpperCase().includes(normalizedKey)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || normalizedKey,
    kind: 'fixed'
  };
}

export function findSkillOption(
  categories: SystemMechanicsConfig = [],
  skillId?: string
): ConfiguredOptionResult | undefined {
  if (!skillId) return undefined;
  const normalizedKey = String(skillId).trim().toLowerCase();
  const cat = categories.find(c => c.id === 'skill' || c.coreKey === 'skill' || c.id === 'core.skill');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey?.toLowerCase() === normalizedKey ||
    r.id?.toLowerCase().endsWith(`.${normalizedKey}`) ||
    r.name?.toLowerCase().includes(normalizedKey)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || normalizedKey,
    kind: 'fixed'
  };
}

export function findRollTypeOption(
  categories: SystemMechanicsConfig = [],
  rollType?: string
): ConfiguredOptionResult | undefined {
  if (!rollType) return undefined;
  const normalizedKey = String(rollType).trim().toLowerCase();
  const cat = categories.find(c => c.id === 'roll_type' || c.coreKey === 'roll_type' || c.id === 'core.roll_type');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey?.toLowerCase() === normalizedKey ||
    r.id?.toLowerCase().endsWith(`.${normalizedKey}`) ||
    r.name?.toLowerCase().includes(normalizedKey)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || normalizedKey,
    kind: 'fixed'
  };
}

export function findModifierTargetOption(
  categories: SystemMechanicsConfig = [],
  targetKey?: string
): ConfiguredOptionResult | undefined {
  if (!targetKey) return undefined;
  const key = String(targetKey).trim();
  const lower = key.toLowerCase();
  const upper = key.toUpperCase();

  // 1. Base Attributes (FUE, DES, RES, INT, VEL, VOL)
  const attrOpt = findAttributeOption(categories, upper) || findAttributeOption(categories, lower);
  if (attrOpt) return attrOpt;

  // 2. Derived Stats (DB, EVA, COR, INI, RD, SAL, EST)
  const statOpt = findStatOption(categories, upper) || findStatOption(categories, lower);
  if (statOpt) return statOpt;

  // 3. Skills (Carisma, Presencia)
  const skillOpt = findSkillOption(categories, lower);
  if (skillOpt) return skillOpt;

  // 4. Roll / Tirada
  if (lower === 'roll' || lower === 'tirada') {
    const rollOpt = findRollTypeOption(categories, 'roll') || findRollTypeOption(categories, 'tirada');
    if (rollOpt) return rollOpt;
  }

  // 5. Reducción de Estamina / Cost Adjustment
  if (lower.includes('estamina') || lower === 'stamina' || lower === 'stamina_reduction' || lower === 'es') {
    const costOpt = findCostAdjustmentOption(categories, 'stamina_reduction') ||
      findCostAdjustmentOption(categories, 'stamina') ||
      findCostAdjustmentOption(categories, 'es');
    if (costOpt) return costOpt;
  }

  return undefined;
}

export function findMaintenanceOption(
  categories: SystemMechanicsConfig = [],
  amount?: number | string,
  resourceId: string = 'ES'
): ConfiguredOptionResult | undefined {
  if (amount === undefined || amount === null || amount === '') return undefined;
  const num = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
  if (isNaN(num) || num <= 0) return undefined;
  const cat = categories.find(c => c.id === 'maintenance' || c.coreKey === 'maintenance' || c.id === 'core.maintenance');
  if (!cat || !cat.rules) return undefined;
  const normRes = (resourceId || 'ES').toUpperCase();
  const prefix = normRes === 'SA' || normRes === 'HP' ? 'hp' : 'es';
  const strVal = String(num);
  const rule = cat.rules.find(r => {
    const rRes = (r as any).component?.resourceId || ((r as any).runtimeKey?.startsWith('hp') ? 'SA' : 'ES');
    const resMatches = rRes.toUpperCase() === normRes || (normRes === 'HP' && rRes === 'SA');
    const amtMatches = (r as any).component?.amount === num ||
      (r as any).runtimeKey === `${prefix}${num}` ||
      (r as any).runtimeKey === strVal ||
      r.id.endsWith(`.${prefix}${num}`) ||
      r.id.endsWith(`.${strVal}`);
    return resMatches && amtMatches;
  });
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || `${prefix}${num}`,
    amount: num,
    resourceId: normRes,
    kind: 'fixed'
  };
}

export function findTargetOption(
  categories: SystemMechanicsConfig = [],
  targetType?: string
): ConfiguredOptionResult | undefined {
  if (!targetType) return undefined;
  const cat = categories.find(c => c.id === 'target' || c.coreKey === 'target' || c.id === 'core.target');
  if (!cat || !cat.rules) return undefined;
  const lower = targetType.trim().toLowerCase();
  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === lower ||
    r.id?.toLowerCase().endsWith(`.${lower}`) ||
    (r as any).runtimeKey?.toLowerCase() === lower ||
    (r.name && r.name.toLowerCase() === lower)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || lower,
    kind: 'fixed'
  };
}

export function findAreaOption(
  categories: SystemMechanicsConfig = [],
  areaQuery?: number | string
): ConfiguredOptionResult | undefined {
  if (areaQuery === undefined || areaQuery === null || areaQuery === '') return undefined;
  const cat = categories.find(c => c.id === 'area' || c.coreKey === 'area' || c.id === 'core.area');
  if (!cat || !cat.rules) return undefined;
  const str = String(areaQuery).trim().toLowerCase();
  const num = parseInt(str.replace(/[^0-9]/g, ''), 10);

  // 1. Exact direct match on id, runtimeKey or name
  let rule = cat.rules.find(r => {
    const rk = (r as any).runtimeKey?.toLowerCase();
    return (
      r.id?.toLowerCase() === str ||
      r.id?.toLowerCase().endsWith(`.${str}`) ||
      rk === str ||
      (r.name && r.name.toLowerCase() === str)
    );
  });

  // 2. Numeric match on runtimeKey or id ending with the number
  if (!rule && !isNaN(num)) {
    rule = cat.rules.find(r => {
      const rk = (r as any).runtimeKey?.toLowerCase();
      return rk === String(num) || r.id?.toLowerCase().endsWith(`.${num}`);
    });
  }

  // 3. Component radius match
  if (!rule && !isNaN(num)) {
    rule = cat.rules.find(r => (r as any).component?.radius === num);
  }

  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || str,
    amount: !isNaN(num) ? num : undefined,
    kind: 'fixed'
  };
}

export function findTargetCountOption(
  categories: SystemMechanicsConfig = [],
  count?: number | string,
  targetType?: string
): ConfiguredOptionResult | undefined {
  if (count === undefined || count === null || count === '') return undefined;
  const cat = categories.find(c => c.id === 'target_count' || c.coreKey === 'target_count' || c.id === 'core.target_count');
  if (!cat || !cat.rules) return undefined;
  const str = String(count).trim().toLowerCase();
  const normType = targetType ? targetType.trim().toLowerCase() : undefined;

  if (str === 'all') {
    const rule = cat.rules.find(r => (r as any).runtimeKey === 'all' || r.id.endsWith('.all'));
    if (!rule) return undefined;
    return {
      ruleId: rule.id,
      name: rule.name,
      cost: typeof rule.cost === 'number' ? rule.cost : 0,
      runtimeKey: 'all',
      kind: 'semantic'
    };
  }

  const num = parseInt(str, 10);
  if (isNaN(num) || num <= 0) return undefined;

  // 1. If targetType is provided (e.g. 'enemy', 'ally'), check for specific targetType + count rule first
  if (normType) {
    const specificRule = cat.rules.find(r => {
      const rk = (r as any).runtimeKey?.toLowerCase();
      const comp = (r as any).component;
      const isTypeMatch = comp?.targetType === normType || rk?.startsWith(`${normType}_`) || r.id?.includes(`.${normType}_`);
      const isNumMatch = comp?.max === num || rk === `${normType}_${num}` || r.id?.endsWith(`.${normType}_${num}`);
      return isTypeMatch && isNumMatch;
    });
    if (specificRule) {
      return {
        ruleId: specificRule.id,
        name: specificRule.name,
        cost: typeof specificRule.cost === 'number' ? specificRule.cost : 0,
        runtimeKey: (specificRule as any).runtimeKey || `${normType}_${num}`,
        amount: num,
        kind: 'fixed'
      };
    }
  }

  // 2. Generic fallback
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey === String(num) ||
    (r as any).component?.max === num ||
    r.id.endsWith(`.${num}`)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: String(num),
    amount: num,
    kind: 'fixed'
  };
}

export function findHealthCostOption(
  categories: SystemMechanicsConfig = [],
  amount?: number | string
): ConfiguredOptionResult | undefined {
  if (amount === undefined || amount === null || amount === '') return undefined;
  const num = typeof amount === 'number' ? amount : parseInt(String(amount), 10);
  if (isNaN(num) || num <= 0) return undefined;
  const cat = categories.find(c => c.id === 'health_cost' || c.coreKey === 'health_cost' || c.id === 'core.health_cost');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    (r as any).runtimeKey === String(num) ||
    (r as any).component?.consequence?.amount === num ||
    r.id.endsWith(`.${num}`) ||
    (num === 1 && (r as any).runtimeKey === 'base')
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || String(num),
    amount: num,
    kind: 'fixed'
  };
}

export function findCostAdjustmentOption(
  categories: SystemMechanicsConfig = [],
  scopeId?: string,
  amount?: number | string
): ConfiguredOptionResult | undefined {
  const cat = categories.find(c => c.id === 'cost_adjustment' || c.coreKey === 'cost_adjustment' || c.id === 'core.cost_adjustment');
  if (!cat || !cat.rules) return undefined;
  const scope = (scopeId || 'quirk').toLowerCase();
  const num = typeof amount === 'number' ? amount : amount ? parseInt(String(amount), 10) : undefined;
  const rule = cat.rules.find(r => {
    const rScope = (r as any).effect?.scopeId?.toLowerCase() || (r as any).runtimeKey?.toLowerCase();
    const rAmt = (r as any).effect?.amount;
    if (num !== undefined && rAmt !== undefined) {
      return (rScope === scope || (r as any).runtimeKey === `${scope}${num}`) && rAmt === num;
    }
    return rScope === scope || (r as any).runtimeKey?.startsWith(scope);
  });
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || scope,
    kind: 'fixed'
  };
}

export function findStatusOption(
  categories: SystemMechanicsConfig = [],
  statusId?: string
): ConfiguredOptionResult | undefined {
  if (!statusId) return undefined;
  const raw = String(statusId).trim();
  const lower = raw.toLowerCase();
  const normalizedKey = lower.replace(/^core\.status\./, '');
  const cat = categories.find(c => c.id === 'status' || c.coreKey === 'status' || c.id === 'core.status');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === lower ||
    r.id?.toLowerCase() === `core.status.${normalizedKey}` ||
    (r as any).runtimeKey?.toLowerCase() === normalizedKey ||
    (r as any).effect?.statusElementId?.toLowerCase() === lower ||
    (r as any).effect?.statusElementId?.toLowerCase() === `core.status.${normalizedKey}` ||
    r.name?.toLowerCase() === lower ||
    (r.name?.toLowerCase().includes(lower) && lower.length > 3)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || normalizedKey,
    kind: 'fixed'
  };
}

export function findObjectManipulationOption(
  categories: SystemMechanicsConfig = [],
  size?: string
): ConfiguredOptionResult | undefined {
  if (!size) return undefined;
  const raw = String(size).trim();
  const lower = raw.toLowerCase();
  const cat = categories.find(c => c.id === 'object_manipulation' || c.coreKey === 'object_manipulation' || c.id === 'core.object_manipulation');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === lower ||
    r.id?.toLowerCase().endsWith(`.${lower}`) ||
    (r as any).runtimeKey?.toLowerCase() === lower ||
    (r as any).effect?.size?.toLowerCase() === lower ||
    r.name?.toLowerCase().includes(lower)
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || lower,
    kind: 'fixed'
  };
}

export function findTransformationOption(
  categories: SystemMechanicsConfig = [],
  magnitude?: string
): ConfiguredOptionResult | undefined {
  if (!magnitude) return undefined;
  const raw = String(magnitude).trim();
  const lower = raw.toLowerCase();
  const normalizedKey = lower === 'corporal' ? 'body' : lower;
  const cat = categories.find(c => c.id === 'transformation' || c.coreKey === 'transformation' || c.id === 'core.transformation');
  if (!cat || !cat.rules) return undefined;
  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === lower ||
    r.id?.toLowerCase().endsWith(`.${normalizedKey}`) ||
    (r as any).runtimeKey?.toLowerCase() === normalizedKey ||
    (r as any).runtimeKey?.toLowerCase() === lower ||
    (r as any).effect?.magnitude?.type?.toLowerCase() === lower ||
    (r as any).effect?.magnitude?.type?.toLowerCase() === normalizedKey ||
    r.name?.toLowerCase() === lower ||
    (lower === 'body' && r.name?.toLowerCase() === 'corporal') ||
    (lower === 'corporal' && (r as any).runtimeKey === 'body')
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || normalizedKey,
    kind: 'fixed'
  };
}

export function findDurationOption(
  categories: SystemMechanicsConfig = [],
  durationQuery?: number | string
): ConfiguredOptionResult | undefined {
  if (durationQuery === undefined || durationQuery === null || durationQuery === '') return undefined;
  const cat = categories.find(c => c.id === 'duration' || c.coreKey === 'duration' || c.id === 'core.duration');
  if (!cat || !cat.rules) return undefined;
  const str = String(durationQuery).trim().toLowerCase();
  
  const normKey = str === '1 día' || str === '1 dia' || str === '1day' || str === 'day' || str === 'days' ? '1_day' :
    str === '1 semana' || str === '1week' || str === 'week' || str === 'weeks' ? '1_week' :
    str === '1 mes' || str === '1month' || str === 'month' || str === 'months' ? '1_month' :
    str;

  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === normKey ||
    r.id?.toLowerCase().endsWith(`.${normKey}`) ||
    (r as any).runtimeKey?.toLowerCase() === normKey ||
    (r as any).runtimeKey?.toLowerCase() === str ||
    (r as any).component?.duration?.mode === 'turns' && String((r as any).component?.duration?.turns) === str ||
    r.name?.toLowerCase() === str ||
    r.name?.toLowerCase() === normKey
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || normKey,
    kind: 'fixed'
  };
}

export function findActivationOption(
  categories: SystemMechanicsConfig = [],
  activationQuery?: number | string
): ConfiguredOptionResult | undefined {
  if (activationQuery === undefined || activationQuery === null || activationQuery === '') return undefined;
  const cat = categories.find(c => c.id === 'activation' || c.coreKey === 'activation' || c.id === 'core.activation');
  if (!cat || !cat.rules) return undefined;
  const str = String(activationQuery).trim().toLowerCase();

  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === str ||
    r.id?.toLowerCase().endsWith(`.${str}`) ||
    (r as any).runtimeKey?.toLowerCase() === str ||
    (r as any).component?.turns === Number(activationQuery) ||
    ((r as any).component?.kind === 'activation' && (r as any).component?.turns === Number(activationQuery)) ||
    r.name?.toLowerCase() === str
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || str,
    kind: 'fixed'
  };
}

export function findCooldownOption(
  categories: SystemMechanicsConfig = [],
  cooldownQuery?: number | string
): ConfiguredOptionResult | undefined {
  if (cooldownQuery === undefined || cooldownQuery === null || cooldownQuery === '') return undefined;
  const cat = categories.find(c => c.id === 'cooldown' || c.coreKey === 'cooldown' || c.id === 'core.cooldown');
  if (!cat || !cat.rules) return undefined;
  const str = String(cooldownQuery).trim().toLowerCase();

  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === str ||
    r.id?.toLowerCase().endsWith(`.${str}`) ||
    (r as any).runtimeKey?.toLowerCase() === str ||
    (r as any).component?.turns === Number(cooldownQuery) ||
    ((r as any).component?.kind === 'cooldown' && (r as any).component?.turns === Number(cooldownQuery)) ||
    r.name?.toLowerCase() === str
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || str,
    kind: 'fixed'
  };
}

export function findUsageOption(
  categories: SystemMechanicsConfig = [],
  usageQuery?: string
): ConfiguredOptionResult | undefined {
  if (usageQuery === undefined || usageQuery === null || usageQuery === '') return undefined;
  const cat = categories.find(c => c.id === 'usage' || c.coreKey === 'usage' || c.id === 'core.usage');
  if (!cat || !cat.rules) return undefined;
  const str = String(usageQuery).trim().toLowerCase();

  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === str ||
    r.id?.toLowerCase().endsWith(`.${str}`) ||
    (r as any).runtimeKey?.toLowerCase() === str ||
    (r as any).component?.period === str ||
    ((r as any).component?.kind === 'usage' && (r as any).component?.period === str) ||
    r.name?.toLowerCase() === str
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || str,
    kind: 'fixed'
  };
}

export function findManualConditionOption(
  categories: SystemMechanicsConfig = [],
  conditionQuery?: string
): ConfiguredOptionResult | undefined {
  if (conditionQuery === undefined || conditionQuery === null || conditionQuery === '') return undefined;
  const cat = categories.find(c => c.id === 'manual_condition' || c.coreKey === 'manual_condition' || c.id === 'core.manual_condition');
  if (!cat || !cat.rules) return undefined;
  const str = String(conditionQuery).trim().toLowerCase();

  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === str ||
    r.id?.toLowerCase().endsWith(`.${str}`) ||
    (r as any).runtimeKey?.toLowerCase() === str ||
    r.name?.toLowerCase() === str
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || str,
    kind: 'fixed'
  };
}

export function findAdditionalRequirementOption(
  categories: SystemMechanicsConfig = [],
  requirementQuery?: string
): ConfiguredOptionResult | undefined {
  if (requirementQuery === undefined || requirementQuery === null || requirementQuery === '') return undefined;
  const cat = categories.find(c => c.id === 'additional_requirement' || c.coreKey === 'additional_requirement' || c.id === 'core.additional_requirement');
  if (!cat || !cat.rules) return undefined;
  const str = String(requirementQuery).trim().toLowerCase();

  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === str ||
    r.id?.toLowerCase().endsWith(`.${str}`) ||
    (r as any).runtimeKey?.toLowerCase() === str ||
    r.name?.toLowerCase() === str
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || str,
    kind: 'fixed'
  };
}

export function findConsequenceOption(
  categories: SystemMechanicsConfig = [],
  query?: string | number
): ConfiguredOptionResult | undefined {
  if (query === undefined || query === null || query === '') return undefined;
  const cat = categories.find(c => c.id === 'consequence' || c.coreKey === 'consequence' || c.id === 'core.consequence');
  if (!cat || !cat.rules) return undefined;
  const str = String(query).trim().toLowerCase();

  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === str ||
    r.id?.toLowerCase().endsWith(`.${str}`) ||
    (r as any).runtimeKey?.toLowerCase() === str ||
    r.name?.toLowerCase() === str
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || str,
    kind: 'fixed'
  };
}

export function findCapOption(
  categories: SystemMechanicsConfig = [],
  query?: string | number
): ConfiguredOptionResult | undefined {
  if (query === undefined || query === null || query === '') return undefined;
  const cat = categories.find(c => c.id === 'caps' || c.coreKey === 'caps' || c.id === 'core.caps');
  if (!cat || !cat.rules) return undefined;
  const str = String(query).trim().toLowerCase();

  const rule = cat.rules.find(r =>
    r.id?.toLowerCase() === str ||
    r.id?.toLowerCase().endsWith(`.${str}`) ||
    (r as any).runtimeKey?.toLowerCase() === str ||
    (r as any).component?.max === Number(query) ||
    r.name?.toLowerCase() === str
  );
  if (!rule) return undefined;
  return {
    ruleId: rule.id,
    name: rule.name,
    cost: typeof rule.cost === 'number' ? rule.cost : 0,
    runtimeKey: (rule as any).runtimeKey || str,
    kind: 'fixed'
  };
}

export function findConfiguredRule(
  categories: SystemMechanicsConfig = [],
  categoryKey: string,
  query: any
): ConfiguredOptionResult | undefined {
  switch (categoryKey) {
    case 'activation':
      return findActivationOption(categories, typeof query === 'object' ? query?.turns || query?.actionType : query);
    case 'cooldown':
      return findCooldownOption(categories, typeof query === 'object' ? query?.turns : query);
    case 'usage':
      return findUsageOption(categories, typeof query === 'object' ? query?.period || query?.scope : query);
    case 'manual_condition':
      return findManualConditionOption(categories, typeof query === 'object' ? query?.signalId || query?.runtimeKey : query);
    case 'additional_requirement':
      return findAdditionalRequirementOption(categories, typeof query === 'object' ? query?.signalId || query?.runtimeKey : query);
    case 'consequence':
      return findConsequenceOption(categories, typeof query === 'object' ? query?.type || query?.runtimeKey : query);
    case 'caps':
      return findCapOption(categories, typeof query === 'object' ? query?.subject || query?.max : query);
    case 'damage':
      return findDamageOption(categories, typeof query === 'string' ? query : query?.dice || query?.formula);
    case 'damage_type':
      return findDamageTypeOption(categories, typeof query === 'string' ? query : query?.damageType);
    case 'healing': {
      const h = findHealingOption(categories, query, query?.resourceId);
      if (!h) return undefined;
      return {
        ruleId: h.ruleId || h.id,
        name: h.name,
        cost: h.cost,
        runtimeKey: h.runtimeKey,
        amount: h.amount,
        dice: h.dice || h.formula,
        resourceId: h.resourceId,
        kind: h.kind
      };
    }
    case 'barrier':
      return findBarrierOption(categories, typeof query === 'number' || typeof query === 'string' ? query : query?.amount);
    case 'numeric_modifier':
    case 'bonus':
    case 'penalty':
      return findNumericModifierOption(categories, typeof query === 'number' || typeof query === 'string' ? query : query?.amount);
    case 'derived_stat':
      return findStatOption(categories, typeof query === 'string' ? query : query?.statId);
    case 'attribute':
      return findAttributeOption(categories, typeof query === 'string' ? query : query?.attributeId);
    case 'skill':
      return findSkillOption(categories, typeof query === 'string' ? query : query?.skillId);
    case 'status':
      return findStatusOption(categories, typeof query === 'string' ? query : query?.statusElementId);
    case 'object_manipulation':
      return findObjectManipulationOption(categories, typeof query === 'string' ? query : query?.size);
    case 'transformation':
      return findTransformationOption(categories, typeof query === 'string' ? query : query?.magnitude?.type || query?.magnitude);
    case 'duration':
      return findDurationOption(categories, typeof query === 'object' ? query?.turns || query?.type : query);
    case 'maintenance':
      return findMaintenanceOption(categories, typeof query === 'number' || typeof query === 'string' ? query : query?.amount, query?.resource || query?.resourceId);
    case 'target_count':
      return findTargetCountOption(categories, typeof query === 'number' || typeof query === 'string' ? query : query?.count ?? query?.mode);
    case 'health_cost':
      return findHealthCostOption(categories, typeof query === 'number' || typeof query === 'string' ? query : query?.amount);
    case 'cost_adjustment':
      return findCostAdjustmentOption(categories, query?.scopeId, query?.amount);
    default: {
      const cat = categories.find(c => c.id === categoryKey || c.coreKey === categoryKey || c.id === `core.${categoryKey}`);
      if (!cat || !cat.rules) return undefined;
      const strVal = String(typeof query === 'object' ? query?.runtimeKey || query?.id || query?.value : query).trim().toLowerCase();
      const rule = cat.rules.find(r =>
        (r as any).runtimeKey?.toLowerCase() === strVal ||
        r.id.toLowerCase() === strVal ||
        r.id.toLowerCase().endsWith(`.${strVal}`) ||
        r.name.toLowerCase() === strVal
      );
      if (!rule) return undefined;
      return {
        ruleId: rule.id,
        name: rule.name,
        cost: typeof rule.cost === 'number' ? rule.cost : 0,
        runtimeKey: (rule as any).runtimeKey || strVal
      };
    }
  }
}

export function validateBehaviorMechanicalValues(
  behavior: any,
  categories: SystemMechanicsConfig = []
): { valid: boolean; errors: string[] } {
  if (!behavior) return { valid: true, errors: [] };
  const errors: string[] = [];

  // 1. Effects
  if (Array.isArray(behavior.effects)) {
    for (let i = 0; i < behavior.effects.length; i++) {
      const eff = behavior.effects[i];
      if (!eff) continue;
      if (eff.type === 'damage') {
        const dmgVal = eff.dice || (eff as any).formula || eff.amount;
        if (dmgVal !== undefined && dmgVal !== null && dmgVal !== '') {
          const found = findDamageOption(categories, dmgVal);
          if (!found) {
            errors.push(`Efecto [${i + 1}] (Daño): La magnitud "${dmgVal}" no existe como opción configurada en Reglas del Sistema.`);
          }
        }
      } else if (eff.type === 'healing') {
        const found = findHealingOption(categories, eff, eff.resourceId || 'SA');
        if (!found) {
          const valDesc = eff.magnitude?.formula || eff.formula || eff.dice || eff.amount;
          errors.push(`Efecto [${i + 1}] (Curación): El valor "${valDesc}" para ${eff.resourceId || 'SA'} no está configurado en Reglas del Sistema.`);
        }
      } else if (eff.type === 'barrier' && eff.amount) {
        const found = findBarrierOption(categories, eff.amount);
        if (!found) {
          errors.push(`Efecto [${i + 1}] (Barrera): La cantidad "${eff.amount}" no está configurada en Reglas del Sistema.`);
        }
      } else if (eff.type === 'attribute_modifier') {
        if (!eff.attributeId || typeof eff.attributeId !== 'string' || !eff.attributeId.trim()) {
          errors.push(`Efecto [${i + 1}] (Modificador de atributo): Debe especificar un atributo válido.`);
        }
        if (eff.amount !== undefined && eff.amount !== null && eff.amount !== 0) {
          const found = findNumericModifierOption(categories, eff.amount);
          if (!found) {
            const signStr = eff.amount > 0 ? `+${eff.amount}` : String(eff.amount);
            errors.push(`Efecto [${i + 1}] (Modificador de atributo): La magnitud "${signStr}" no está configurada en Reglas del Sistema.`);
          }
        }
      } else if (eff.type === 'skill_modifier' || eff.type === 'derived_stat_modifier' || eff.type === 'bonus' || eff.type === 'penalty') {
        if (eff.amount !== undefined && eff.amount !== null && eff.amount !== 0) {
          const found = findNumericModifierOption(categories, eff.amount);
          if (!found) {
            const signStr = eff.amount > 0 ? `+${eff.amount}` : String(eff.amount);
            errors.push(`Efecto [${i + 1}] (Modificador): La magnitud "${signStr}" no está configurada en Reglas del Sistema.`);
          }
        }
      }
    }
  }

  // 1.1. Limitations
  if (Array.isArray(behavior.limitations)) {
    for (let i = 0; i < behavior.limitations.length; i++) {
      const lim = behavior.limitations[i];
      if (lim && lim.type === 'self_damage' && lim.frequency === 'each_active_turn') {
        const durTurns = behavior.temporality?.duration?.turns ?? behavior.temporality?.duration?.value ?? behavior.effects?.find((e: any) => e.temporality?.duration?.turns)?.temporality?.duration?.turns;
        if (typeof durTurns !== 'number' || durTurns <= 0) {
          errors.push('Limitante (Daño autoinfligido): La frecuencia "Cada turno activo" requiere que la técnica defina una duración finita en turnos.');
        }
      }
    }
  }

  // 2. Target Count
  if (behavior.target?.quantity?.count !== undefined && behavior.target.quantity.count !== null) {
    const found = findTargetCountOption(categories, behavior.target.quantity.count);
    if (!found) {
      errors.push(`Objetivo: La cantidad de objetivos "${behavior.target.quantity.count}" no está configurada en Reglas del Sistema.`);
    }
  }

  // 3. Maintenance
  if (behavior.temporality?.maintenance?.enabled && behavior.temporality.maintenance.amount) {
    const found = findMaintenanceOption(categories, behavior.temporality.maintenance.amount, behavior.temporality.maintenance.resource);
    if (!found) {
      errors.push(`Mantenimiento: La cantidad "${behavior.temporality.maintenance.amount} ${behavior.temporality.maintenance.resource || 'ES'}" no está configurada en Reglas del Sistema.`);
    }
  }

  // 4. Consequences (Health Cost / Sacrifice)
  if (Array.isArray(behavior.consequences)) {
    for (let i = 0; i < behavior.consequences.length; i++) {
      const cons = behavior.consequences[i];
      if (cons && cons.type === 'hp_cost' && cons.amount) {
        const found = findHealthCostOption(categories, cons.amount);
        if (!found) {
          errors.push(`Consecuencia [${i + 1}] (Coste de HP): El sacrificio de "${cons.amount} HP" no está configurado en Reglas del Sistema.`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Helper to calculate the Complexity Adjustment CE cost based on the number of behaviors in a technique.
 * Values are retrieved dynamically from the complexity_adjustment category in System Rules.
 */
export function getComplexityAdjustmentCost(
  behaviorCount: number,
  categories: SystemMechanicsConfig = []
): { cost: number; ruleName?: string } {
  if (behaviorCount <= 0) return { cost: 0 };
  const effectiveCats = (!categories || categories.length === 0) ? createCoreCategories() : categories;
  const cat = effectiveCats.find(c => c.id === 'complexity_adjustment' || c.coreKey === 'complexity_adjustment' || c.id === 'core.complexity_adjustment' || c.category === 'Ajuste por Complejidad');
  if (!cat || !cat.rules || cat.rules.length === 0) {
    if (behaviorCount === 1) return { cost: 0, ruleName: '1 Comportamiento' };
    if (behaviorCount === 2) return { cost: 2, ruleName: '2 Comportamientos' };
    if (behaviorCount === 3) return { cost: 4, ruleName: '3 Comportamientos' };
    if (behaviorCount === 4) return { cost: 6, ruleName: '4 Comportamientos' };
    return { cost: 8, ruleName: '5+ Comportamientos' };
  }

  // Look for exact rule matching count
  const exact = cat.rules.find(r => 
    r.isAvailable !== false &&
    ((r as any).runtimeKey === `behaviors_${behaviorCount}` ||
    (r as any).component?.count === behaviorCount ||
    r.id.endsWith(`_${behaviorCount}`) ||
    r.name.toLowerCase().startsWith(`${behaviorCount} `) ||
    r.name.toLowerCase() === `${behaviorCount} comportamientos` ||
    r.name.toLowerCase() === `${behaviorCount} comportamiento`)
  );
  if (exact && typeof exact.cost === 'number') {
    return { cost: exact.cost, ruleName: exact.name };
  }

  // Look for all tier rules and find the closest applicable (<= behaviorCount) or fallback to highest
  const countRules = cat.rules
    .filter(r => r.isAvailable !== false && typeof r.cost === 'number')
    .map(r => {
      const match = r.name.match(/^(\d+)/) || r.id.match(/_(\d+)$/);
      const c = (r as any).component?.count ?? (match ? parseInt(match[1], 10) : undefined);
      return { rule: r, count: c };
    })
    .filter((entry): entry is { rule: any; count: number } => typeof entry.count === 'number')
    .sort((a, b) => b.count - a.count);

  if (countRules.length > 0) {
    const match = countRules.find(entry => entry.count <= behaviorCount);
    if (match) {
      return { cost: match.rule.cost, ruleName: match.rule.name };
    }
  }

  return { cost: 0 };
}

/**
 * Pure canonical helper: calculates the intrinsic structural stamina cost of a technique
 * based on its level minimum and configured mechanics (WITHOUT character-specific modifiers).
 */
export function calculateTechniqueStructuralCost(
  technique: { level?: number; mechanicalBehaviors?: any[] } | any[],
  categories: SystemMechanicsConfig = [],
  policy?: StaminaExecutionCosts
): number {
  const behaviors = Array.isArray(technique) ? technique : (technique?.mechanicalBehaviors ?? []);
  const level = !Array.isArray(technique) ? (technique?.level ?? 1) : 1;
  const levelBase = policy?.techniqueByLevel?.find(item => item.level === level)?.cost ?? 0;
  const effectiveCats = (!categories || categories.length === 0) ? createCoreCategories() : categories;

  let mechanicCostSum = 0;

  function lookupRuleCostOpt(catKey: string, optionKey: string | number | undefined | null): { found: boolean; cost: number } {
    if (optionKey === undefined || optionKey === null || optionKey === '') return { found: false, cost: 0 };
    const strKey = String(optionKey);
    const cat = effectiveCats.find(c => c.id === catKey || c.category === catKey || c.coreKey === catKey || c.id === `core.${catKey}`);
    if (!cat || !cat.rules) return { found: false, cost: 0 };
    const rule = cat.rules.find(r => 
      r.id === strKey || 
      (r as any).runtimeKey === strKey || 
      (r as any).runtimeKey?.toLowerCase() === strKey.toLowerCase() ||
      r.id === `${cat.id}.${strKey}` ||
      r.id === `${cat.id}.${strKey.toLowerCase()}` ||
      r.id.endsWith(`.${strKey}`) ||
      ((r as any).component?.kind === 'condition' && (r as any).component?.predicates?.some((p: any) => p.signalId === strKey || p.kind === strKey)) ||
      ((r as any).component?.kind === 'cooldown' && (r as any).component?.turns === Number(optionKey)) ||
      ((r as any).component?.kind === 'activation' && (r as any).component?.turns === Number(optionKey)) ||
      ((r as any).component?.kind === 'complexity_adjustment' && (r as any).component?.count === Number(optionKey)) ||
      ((r as any).component?.kind === 'usage' && ((r as any).component?.period === strKey || (r as any).component?.scope === strKey)) ||
      (r as any).component?.turns === Number(optionKey) ||
      (r as any).effect?.dice?.toLowerCase() === strKey.toLowerCase() ||
      (r as any).effect?.amount === Number(optionKey) ||
      (r as any).effect?.statusElementId === strKey ||
      (r as any).effect?.statusElementId?.toLowerCase() === strKey.toLowerCase() ||
      (r as any).effect?.size?.toLowerCase() === strKey.toLowerCase() ||
      (r as any).effect?.magnitude?.type?.toLowerCase() === strKey.toLowerCase() ||
      r.name.toLowerCase() === strKey.toLowerCase()
    );
    if (rule && typeof rule.cost === 'number') {
      return { found: true, cost: rule.cost };
    }
    return { found: false, cost: 0 };
  }

  function lookupRuleCost(catKey: string, optionKey: string | number | undefined | null): number {
    return lookupRuleCostOpt(catKey, optionKey).cost;
  }

  for (const b of behaviors) {
    if (!b) continue;

    // 1. Activation & Trigger mode costs
    if (b.mode === 'active' && b.activation?.actionType) {
      mechanicCostSum += lookupRuleCost('activation', b.activation.actionType);
      const delayTurns = b.activation.delay ?? b.activation.turns;
      if (delayTurns && delayTurns > 0) {
        mechanicCostSum += lookupRuleCost('activation_delay', delayTurns) ||
          lookupRuleCost('activation', `delay_${delayTurns}`) ||
          lookupRuleCost('activation', `delay${delayTurns}`) ||
          lookupRuleCost('activation_delay', String(delayTurns));
      }
    } else if (b.mode === 'reactive' && b.trigger?.kind) {
      mechanicCostSum += lookupRuleCost('trigger', b.trigger.kind);
    }

    // 2. Target, Range, Area, Target count, Selection mode
    if (b.target) {
      const targetType = b.target.type || 'self';

      // Invariant CE-4B.1: target.type === 'self' ignores quantity, range, area, selectionMode
      if (targetType === 'self') {
        const targetOpt = findTargetOption(effectiveCats, 'self');
        mechanicCostSum += targetOpt ? targetOpt.cost : (lookupRuleCost('target', 'self') || 0);
      } else {
        const targetOpt = findTargetOption(effectiveCats, targetType);
        mechanicCostSum += targetOpt ? targetOpt.cost : (lookupRuleCost('target', targetType) || 0);

        const rawCount = b.target.quantity?.mode === 'all'
          ? 'all'
          : (b.target.quantity?.count ?? (b.target.quantity as any)?.max ?? b.target.maxTargets);
        if (rawCount !== undefined && rawCount !== null && rawCount !== '') {
          const targetCountOpt = findTargetCountOption(effectiveCats, rawCount, targetType);
          if (targetCountOpt) {
            mechanicCostSum += targetCountOpt.cost;
          } else {
            mechanicCostSum += lookupRuleCost('target_count', `${targetType}_${rawCount}`) ||
              lookupRuleCost('target_count', rawCount);
          }
        }
        if (b.target.range?.type) {
          mechanicCostSum += lookupRuleCost('range', b.target.range.type);
          if (b.target.range.type === 'distance') {
            const dist = b.target.range.distanceMeters ?? b.target.range.distance;
            if (dist !== undefined && dist !== null && dist !== '') {
              mechanicCostSum += lookupRuleCost('range', dist);
            }
          }
        }
        if (b.target.area?.shape) {
          const areaSize = b.target.area.sizeMeters ?? b.target.area.radius;
          const areaOpt = areaSize !== undefined && areaSize !== null && areaSize !== ''
            ? findAreaOption(effectiveCats, areaSize)
            : findAreaOption(effectiveCats, b.target.area.shape);
          if (areaOpt) {
            mechanicCostSum += areaOpt.cost;
          } else {
            mechanicCostSum += lookupRuleCost('area', b.target.area.shape);
            if (areaSize !== undefined && areaSize !== null && areaSize !== '') {
              mechanicCostSum += lookupRuleCost('area', areaSize);
            }
          }
        }
        const selMode = b.target.selectionMode ?? b.target.selectionRestriction;
        if (selMode && selMode !== 'none' && selMode !== 'standard_priority') {
          mechanicCostSum += lookupRuleCost('selection_restriction', selMode) || lookupRuleCost('selection_mode', selMode);
        }
      }
    }

    // 3. Temporality (Duration, Frequency/Periodicity, Maintenance)
    if (b.temporality) {
      const durType = b.temporality.duration?.type || b.temporality.duration?.mode;
      if (durType) {
        const durTurns = b.temporality.duration.turns ?? b.temporality.duration.value;
        if (durType === 'turns' && durTurns) {
          const turnsCost = lookupRuleCost('duration', durTurns);
          mechanicCostSum += turnsCost || lookupRuleCost('duration', String(durTurns)) || lookupRuleCost('duration', 'turns');
        } else {
          const durOpt = findDurationOption(effectiveCats, durType);
          if (durOpt) {
            mechanicCostSum += durOpt.cost;
          } else {
            mechanicCostSum += lookupRuleCost('duration', durType);
          }
        }
      }
      if (b.temporality.periodicity?.mode && b.temporality.periodicity.mode !== 'once') {
        mechanicCostSum += lookupRuleCost('periodicity', b.temporality.periodicity.mode) ||
          lookupRuleCost('frequency', b.temporality.periodicity.mode);
      } else if (b.temporality.frequency?.type && b.temporality.frequency.type !== 'once') {
        mechanicCostSum += lookupRuleCost('periodicity', b.temporality.frequency.type) ||
          lookupRuleCost('frequency', b.temporality.frequency.type);
      }
      if (b.temporality.maintenance?.enabled) {
        const maintOpt = findMaintenanceOption(categories, b.temporality.maintenance.amount, b.temporality.maintenance.resource);
        if (maintOpt) {
          mechanicCostSum += maintOpt.cost;
        } else {
          const resKey = `${b.temporality.maintenance.resource?.toLowerCase() || 'es'}${b.temporality.maintenance.amount || 1}`;
          mechanicCostSum += lookupRuleCost('maintenance', resKey) || lookupRuleCost('maintenance', b.temporality.maintenance.resource);
        }
      }
    }

    // 4. Resolution
    if (b.resolution?.type) {
      mechanicCostSum += lookupRuleCost('resolution', b.resolution.type);
      if (b.resolution.type === 'rd' && b.resolution.rdValue) {
        mechanicCostSum += lookupRuleCost('resolution', `rd_${b.resolution.rdValue}`) || lookupRuleCost('resolution', b.resolution.rdValue);
      }
    }

    // 5. Limitations
    if (Array.isArray(b.limitations)) {
      for (const lim of b.limitations) {
        if (lim.type === 'cooldown' && lim.turns) {
          mechanicCostSum += lookupRuleCost('cooldown', lim.turns) || lookupRuleCost('cooldown', String(lim.turns));
        } else if (lim.type === 'usage_limit') {
          const p = lim.scope ?? lim.period;
          if (p) {
            mechanicCostSum += lookupRuleCost('usage', p) || lookupRuleCost('usage_limit', p);
          }
        } else if (lim.type === 'self_damage') {
          let applicationCount = 1;
          let isValidDuration = true;
          if (lim.frequency === 'each_active_turn') {
            const durTurns = b.temporality?.duration?.turns ?? b.temporality?.duration?.value ?? b.effects?.find((e: any) => e.temporality?.duration?.turns)?.temporality?.duration?.turns;
            if (typeof durTurns === 'number' && durTurns > 0) {
              applicationCount = durTurns;
            } else {
              isValidDuration = false;
            }
          }
          if (isValidDuration) {
            const exposure = (lim.amount || 1) * applicationCount;
            // Documented Order of Precedence for self_damage exposure CE resolution:
            // 1. Explicit rule in self_damage category matching exposure (numeric or string)
            // 2. Canonical consequence rules:
            //    - If frequency === 'each_active_turn': rule 'self_damage_turn' in consequence category (* applicationCount)
            //    - If exposure === 2: rule 'self_damage_fixed_2' in consequence category
            // 3. Option or rule in health_cost category matching exposure (if rule.cost !== 0)
            // 4. Rule matching hp${exposure} in cost_adjustment category
            // 5. Option or rule in health_cost category matching exposure (even if cost === 0)
            // No implicit mathematical fallback is invented if no rule exists; matching cost = 0 stops fallthrough.
            let resolvedCost: number | undefined;

            const rSelfDmg = lookupRuleCostOpt('self_damage', exposure);
            if (rSelfDmg.found) {
              resolvedCost = rSelfDmg.cost;
            } else {
              const rSelfDmgStr = lookupRuleCostOpt('self_damage', String(exposure));
              if (rSelfDmgStr.found) {
                resolvedCost = rSelfDmgStr.cost;
              } else {
                const hpOpt = findHealthCostOption(effectiveCats, exposure);
                if (hpOpt && hpOpt.cost !== 0) {
                  resolvedCost = hpOpt.cost;
                } else {
                  if (lim.frequency === 'each_active_turn') {
                    const rConsTurn = lookupRuleCostOpt('consequence', 'self_damage_turn');
                    if (rConsTurn.found) {
                      resolvedCost = rConsTurn.cost * applicationCount;
                    }
                  }
                  if (resolvedCost === undefined && exposure === 2) {
                    const rConsFixed2 = lookupRuleCostOpt('consequence', 'self_damage_fixed_2');
                    if (rConsFixed2.found) {
                      resolvedCost = rConsFixed2.cost;
                    }
                  }
                  if (resolvedCost === undefined) {
                    const rCostAdj = lookupRuleCostOpt('cost_adjustment', `hp${exposure}`);
                    if (rCostAdj.found) {
                      resolvedCost = rCostAdj.cost;
                    } else if (hpOpt) {
                      resolvedCost = hpOpt.cost;
                    }
                  }
                }
              }
            }

            if (resolvedCost !== undefined) {
              mechanicCostSum += resolvedCost;
            }
          }
        }
      }
    }

    // 6. Effects
    if (Array.isArray(b.effects)) {
      for (const eff of b.effects) {
        if (!eff) continue;
        if (eff.costRules && Array.isArray(eff.costRules)) {
          for (const ref of eff.costRules) {
            const cat = categories.find(c => c.id === ref.mechanicId);
            const rule = cat?.rules.find(r => r.id === ref.ruleId);
            if (rule && typeof rule.cost === "number") {
              mechanicCostSum += rule.cost;
            }
          }
        }
        if (eff.type === 'damage') {
          const dmgVal = eff.dice || (eff as any).formula || eff.amount;
          if (dmgVal !== undefined && dmgVal !== null && dmgVal !== '') {
            const dmgOpt = findDamageOption(categories, dmgVal);
            if (dmgOpt) {
              mechanicCostSum += dmgOpt.cost;
            } else {
              mechanicCostSum += lookupRuleCost('damage', dmgVal);
            }
          }
          if (eff.damageType) {
            const dmgTypeOpt = findDamageTypeOption(categories, eff.damageType);
            if (dmgTypeOpt) {
              mechanicCostSum += dmgTypeOpt.cost;
            } else {
              mechanicCostSum += lookupRuleCost('damage_type', eff.damageType);
            }
          }
        } else if (eff.type === 'healing') {
          const healingOpt = findHealingOption(categories, eff as any, eff.resourceId);
          if (healingOpt) {
            mechanicCostSum += healingOpt.cost;
          } else {
            const res = eff.resourceId === 'ES' ? 'es' : 'hp';
            const val = (eff as any).magnitude?.formula || (eff as any).formula || (eff as any).dice || (eff as any).magnitude?.amount || eff.amount;
            mechanicCostSum += lookupRuleCost('healing', (eff as any).ruleId) ||
              lookupRuleCost('healing', (eff as any).runtimeKey) ||
              lookupRuleCost('healing', `${res}${val}`) ||
              lookupRuleCost('healing', val);
          }
        } else if (eff.type === 'barrier' && eff.amount) {
          const barrierOpt = findBarrierOption(categories, eff.amount);
          if (barrierOpt) {
            mechanicCostSum += barrierOpt.cost;
          } else {
            mechanicCostSum += lookupRuleCost('barrier', (eff as any).ruleId) ||
              lookupRuleCost('barrier', (eff as any).runtimeKey) ||
              lookupRuleCost('barrier', eff.amount);
          }
        } else if (eff.type === 'roll_modifier') {
          const rollKey = eff.rollType || 'roll';
          const rollOpt = findRollTypeOption(effectiveCats, rollKey);
          const targetCost = rollOpt ? rollOpt.cost : (lookupRuleCost('roll_type', rollKey) || 0);
          let magnitudeCost = 0;
          if (typeof eff.amount === 'number' && eff.amount !== 0) {
            const numOpt = findNumericModifierOption(effectiveCats, eff.amount);
            magnitudeCost = numOpt ? numOpt.cost : (lookupRuleCost('numeric_modifier', eff.amount) || lookupRuleCost('bonus', eff.amount) || lookupRuleCost('penalty', eff.amount));
          }
          mechanicCostSum += targetCost + magnitudeCost;
        } else if ((eff.type === 'status_apply' || eff.type === 'status') && (eff.statusElementId || (eff as any).statusId || (eff as any).runtimeKey)) {
          const statusId = eff.statusElementId || (eff as any).statusId || (eff as any).runtimeKey;
          const statusOpt = findStatusOption(effectiveCats, statusId);
          if (statusOpt) {
            mechanicCostSum += statusOpt.cost;
          } else {
            const statusKey = String(statusId).replace(/^core\.status\./, '');
            mechanicCostSum += lookupRuleCost('status', statusId) || lookupRuleCost('status', statusKey);
          }
        } else if (eff.type === 'bonus' || eff.type === 'penalty') {
          const numOpt = findNumericModifierOption(categories, eff.amount);
          if (numOpt) {
            mechanicCostSum += numOpt.cost;
          } else {
            mechanicCostSum += lookupRuleCost('numeric_modifier', eff.amount) || lookupRuleCost(eff.type, eff.amount);
          }
        } else if (eff.type === 'attribute_modifier') {
          const attrOpt = findAttributeOption(effectiveCats, eff.attributeId);
          const targetCost = attrOpt ? attrOpt.cost : (lookupRuleCost('attribute', eff.attributeId) || lookupRuleCost('bonus', eff.attributeId));
          let magnitudeCost = 0;
          if (typeof eff.amount === 'number' && eff.amount !== 0) {
            const numOpt = findNumericModifierOption(effectiveCats, eff.amount);
            magnitudeCost = numOpt ? numOpt.cost : (lookupRuleCost('numeric_modifier', eff.amount) || lookupRuleCost('bonus', eff.amount) || lookupRuleCost('penalty', eff.amount));
          }
          mechanicCostSum += targetCost + magnitudeCost;
        } else if (eff.type === 'skill_modifier' && eff.skillId) {
          const skillOpt = findSkillOption(effectiveCats, eff.skillId);
          const targetCost = skillOpt ? skillOpt.cost : (lookupRuleCost('skill', eff.skillId) || lookupRuleCost('bonus', eff.skillId) || 0);
          let magnitudeCost = 0;
          if (typeof eff.amount === 'number' && eff.amount !== 0) {
            const numOpt = findNumericModifierOption(effectiveCats, eff.amount);
            magnitudeCost = numOpt ? numOpt.cost : (lookupRuleCost('numeric_modifier', eff.amount) || lookupRuleCost('bonus', eff.amount) || lookupRuleCost('penalty', eff.amount));
          }
          mechanicCostSum += targetCost + magnitudeCost;
        } else if (eff.type === 'derived_stat_modifier') {
          const statOpt = findStatOption(effectiveCats, eff.statId);
          const targetCost = statOpt ? statOpt.cost : (lookupRuleCost('derived_stat', eff.statId) || lookupRuleCost('bonus', eff.statId));
          let magnitudeCost = 0;
          if (typeof eff.amount === 'number' && eff.amount !== 0) {
            const numOpt = findNumericModifierOption(effectiveCats, eff.amount);
            magnitudeCost = numOpt ? numOpt.cost : (lookupRuleCost('numeric_modifier', eff.amount) || lookupRuleCost('bonus', eff.amount) || lookupRuleCost('penalty', eff.amount));
          }
          mechanicCostSum += targetCost + magnitudeCost;
        } else if (eff.type === 'rd_modifier') {
          mechanicCostSum += lookupRuleCost('resolution', `rd_${eff.amount}`) || lookupRuleCost('resolution', 'rd');
        } else if (eff.type === 'cost_modifier') {
          const costOpt = findCostAdjustmentOption(effectiveCats, eff.scopeId, eff.amount) ||
            findCostAdjustmentOption(effectiveCats, 'stamina_reduction') ||
            findCostAdjustmentOption(effectiveCats, 'stamina');
          mechanicCostSum += costOpt ? costOpt.cost : (
            lookupRuleCost('cost_adjustment', eff.scopeId ? `${eff.scopeId}${eff.amount}` : eff.amount) ||
            lookupRuleCost('cost_adjustment', eff.scopeId) ||
            lookupRuleCost('cost_adjustment', 'stamina_reduction') ||
            lookupRuleCost('cost_adjustment', 'stamina') ||
            4
          );
        } else if (eff.type === 'resource_modifier') {
          if (eff.amount > 0) {
            const healingOpt = findHealingOption(categories, eff.amount, eff.resourceId);
            mechanicCostSum += healingOpt?.cost ?? 0;
          } else {
            const hpOpt = findHealthCostOption(categories, Math.abs(eff.amount));
            mechanicCostSum += hpOpt ? hpOpt.cost : (
              lookupRuleCost('cost_adjustment', `hp${Math.abs(eff.amount)}`) || lookupRuleCost('health_cost', 'base') || lookupRuleCost('stamina_cost', 'base')
            );
          }
        } else if (eff.type === 'object_manipulation') {
          const sizeKey = (eff as any).size || (eff as any).magnitude || (eff as any).runtimeKey;
          const opt = findObjectManipulationOption(effectiveCats, sizeKey);
          if (opt) {
            mechanicCostSum += opt.cost;
          } else {
            mechanicCostSum += lookupRuleCost('object_manipulation', sizeKey) ||
              lookupRuleCost('object_manipulation', (eff as any).ruleId) ||
              0;
          }
        } else if (eff.type === 'transformation') {
          const magType = (eff as any).magnitude?.type ?? (eff as any).magnitude ?? (eff as any).runtimeKey;
          const opt = findTransformationOption(effectiveCats, magType);
          if (opt) {
            mechanicCostSum += opt.cost;
          } else {
            const catCost = lookupRuleCost('transformation', magType) ||
              lookupRuleCost('transformation', (eff as any).ruleId) ||
              lookupRuleCost('transformation', (eff as any).runtimeKey);
            mechanicCostSum += catCost;
          }
        }
      }
    }

    // 7. Consequences (Health Cost, Self Damage, Recoil, After Effect, While Active Modifier, Threshold Status)
    if (Array.isArray(b.consequences)) {
      for (const cons of b.consequences) {
        if (!cons) continue;
        if (cons.type === 'self_damage_turn' || cons.type === 'self_damage_1' || (cons.type === 'resource' && cons.when === 'each_turn' && cons.amount === 1)) {
          mechanicCostSum += lookupRuleCost('consequence', 'self_damage_turn') || lookupRuleCost('consequence', 'per_turn_hp1') || -1;
        } else if (cons.type === 'self_damage_fixed' || cons.type === 'self_damage_fixed_2' || cons.type === 'self_damage_2' || (cons.type === 'hp_cost' && cons.amount === 2) || (cons.type === 'resource' && cons.when === 'activation' && cons.amount === 2)) {
          mechanicCostSum += lookupRuleCost('consequence', 'self_damage_fixed_2') || lookupRuleCost('consequence', 'self_damage_2') || -1;
        } else if (cons.type === 'hp_cost' && cons.amount) {
          const hpOpt = findHealthCostOption(categories, cons.amount);
          if (hpOpt) {
            mechanicCostSum += hpOpt.cost;
          } else {
            mechanicCostSum += lookupRuleCost('cost_adjustment', `hp${cons.amount}`) || lookupRuleCost('health_cost', cons.amount) || lookupRuleCost('health_cost', 'base');
          }
        } else if (cons.type === 'recoil' || cons.type === 'recoil_half' || cons.consequence?.kind === 'recoil' || (cons.when === 'after_damage' && cons.consequence?.fraction === 0.5)) {
          mechanicCostSum += lookupRuleCost('consequence', 'recoil_half') || lookupRuleCost('consequence', 'recoil') || -4;
        } else if (cons.type === 'after_effect' || cons.type === 'after_effect_int2_3t' || (cons.when === 'end' && (cons.attributeId === 'INT' || cons.consequence?.attributeId === 'INT'))) {
          mechanicCostSum += lookupRuleCost('consequence', 'after_effect_int2_3t') || lookupRuleCost('consequence', 'end_int2') || -3;
        } else if (cons.type === 'while_active_modifier' || cons.type === 'while_active_des2' || (cons.attributeId === 'DES' && cons.untilEnd) || (cons.consequence?.attributeId === 'DES' && cons.consequence?.untilEnd)) {
          mechanicCostSum += lookupRuleCost('consequence', 'while_active_des2') || lookupRuleCost('consequence', 'des2_active') || -2;
        } else if ((cons.type === 'per_turn_modifier' && cons.attributeId === 'INT') || cons.type === 'int2_per_active_turn' || (cons.when === 'each_turn' && cons.consequence?.attributeId === 'INT')) {
          mechanicCostSum += lookupRuleCost('consequence', 'int2_per_active_turn') || -1;
        } else if (cons.type === 'resource_threshold_status' || cons.type === 'overheated_threshold' || (cons.resourceId === 'ES' && (cons.threshold === 5 || cons.value === 5)) || (cons.consequence?.statusElementId === 'core.status.sobrecalentado')) {
          mechanicCostSum += lookupRuleCost('consequence', 'overheated_threshold') || lookupRuleCost('consequence', 'sobrecalentado') || -3;
        } else if (cons.ruleId || cons.runtimeKey) {
          mechanicCostSum += lookupRuleCost('consequence', cons.ruleId || cons.runtimeKey);
        }
      }
    }

    // 8. Conditions (Limiters like resource threshold, die condition, manual requirements)
    if (Array.isArray(b.conditions)) {
      for (const cond of b.conditions) {
        if (cond.type === 'resource' || cond.type === 'resource_threshold') {
          const resKey = `${cond.resourceId?.toLowerCase() || 'es'}${cond.percent ?? cond.value ?? 50}`;
          mechanicCostSum += lookupRuleCost('resource_threshold', resKey) || lookupRuleCost('resource_threshold', cond.thresholdKey) || lookupRuleCost('resource_threshold', cond.percent);
        } else if (cond.type === 'die') {
          const dieKey = `${cond.min ?? 1}to${cond.max ?? 5}`;
          mechanicCostSum += lookupRuleCost('die_condition', dieKey) || lookupRuleCost('die_condition', cond.runtimeKey) || lookupRuleCost('die_condition', cond.value);
        } else if (cond.type === 'contact') {
          const senseKey = `${cond.sense || 'physical'}_contact`;
          mechanicCostSum += lookupRuleCost('manual_condition', senseKey) || lookupRuleCost('manual_condition', cond.sense);
        } else if (cond.type === 'manual') {
          mechanicCostSum += lookupRuleCost('manual_condition', cond.signalId) ||
            lookupRuleCost('manual_condition', cond.runtimeKey) ||
            lookupRuleCost('additional_requirement', cond.signalId) ||
            lookupRuleCost('additional_requirement', cond.runtimeKey);
        } else if (cond.type === 'ability_active' || cond.type === 'active_behavior' || cond.type === 'consumption' || cond.type === 'consume') {
          mechanicCostSum += lookupRuleCost('additional_requirement', (cond.type === 'consumption' || cond.type === 'consume') ? 'consumption' : 'active_ability');
        } else if (cond.type === 'conscious' || cond.type === 'target_conscious') {
          mechanicCostSum += lookupRuleCost('manual_condition', 'conscious') || lookupRuleCost('manual_condition', 'target_conscious');
        }
      }
    }

    // 8b. Requirements (structured / explicit requirements)
    if (Array.isArray(b.requirements)) {
      for (const req of b.requirements) {
        if (req.type === 'physical_contact' || req.type === 'visual_contact' || req.type === 'auditory_contact') {
          mechanicCostSum += lookupRuleCost('manual_condition', req.type) || lookupRuleCost('manual_condition', req.type.replace('_contact', ''));
        } else if (req.type === 'speak_directly') {
          mechanicCostSum += lookupRuleCost('manual_condition', 'speak_directly');
        } else if (req.type === 'target_conscious' || req.type === 'conscious') {
          mechanicCostSum += lookupRuleCost('manual_condition', 'conscious') || lookupRuleCost('manual_condition', 'target_conscious');
        } else if (req.type === 'active_behavior' || req.type === 'active_ability') {
          mechanicCostSum += lookupRuleCost('additional_requirement', 'active_ability') || lookupRuleCost('additional_requirement', 'active_behavior');
        } else if (req.type === 'consume' || req.type === 'consumption') {
          mechanicCostSum += lookupRuleCost('additional_requirement', 'consumption') || lookupRuleCost('additional_requirement', 'consume');
        } else if (req.type === 'manual') {
          mechanicCostSum += lookupRuleCost('manual_condition', req.description) || lookupRuleCost('manual_condition', 'manual');
        }
      }
    }

    // 9. Control & Caps
    if (b.control) {
      const capsList = Array.isArray(b.control.caps) ? b.control.caps : (b.control.cap ? [b.control.cap] : []);
      for (const cap of capsList) {
        if (!cap) continue;
        if (cap.subject === 'absorb_max_6' || cap.subject === 'barrier' || cap.max === 6 || cap.subject === 'damage_absorbed') {
          const capOpt = findCapOption(effectiveCats, 'absorb_max_6') || findCapOption(effectiveCats, 6);
          mechanicCostSum += capOpt ? capOpt.cost : (lookupRuleCost('caps', 'absorb_max_6') || lookupRuleCost('caps', 6) || -3);
        } else if (cap.subject) {
          mechanicCostSum += lookupRuleCost('caps', cap.subject);
        }
      }
    }
  }

  // 10. Complexity Adjustment for Multi-Behavior Techniques
  if (behaviors.length > 0) {
    const complexityAdj = getComplexityAdjustmentCost(behaviors.length, effectiveCats);
    mechanicCostSum += complexityAdj.cost;
  }

  return Math.max(0, Math.max(levelBase, mechanicCostSum));
}

const mechanicRuleSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    cost: z.number().finite(),
    mechDesc: z.string().optional(),
    runtimeKey: z.string().optional(),
    ruleType: z.enum(["effect", "cost_modifier", "component", "ce_adjustment"]).default("cost_modifier"),
    isAvailable: z.boolean().optional(),
    effect: mechanicalEffectDefinitionSchema.optional(),
    component: ruleComponentSchema.optional(),
  })
  .passthrough()
  .superRefine((rule, ctx) => {
    if ((rule.ruleType === "component") !== (rule.component !== undefined) || (rule.ruleType === "component" && rule.effect)) ctx.addIssue({ code: "custom", message: "Invalid rule component" });
    if (rule.ruleType === "effect" && !rule.effect) {
      ctx.addIssue({ code: "custom", path: ["effect"], message: "an effect rule must define executable behavior" });
    }
    const isCostModifier = rule.ruleType === "cost_modifier" || rule.ruleType === "ce_adjustment";
    if (isCostModifier && rule.effect) {
      ctx.addIssue({ code: "custom", path: ["effect"], message: "a cost modifier cannot define executable behavior" });
    }
  });

export const MECHANIC_CATEGORY_FAMILIES = [
  "activation",
  "condition",
  "resolution",
  "target",
  "temporality",
  "limitation",
  "effect",
  "cost",
  "other",
] as const;

export type MechanicCategoryFamily = (typeof MECHANIC_CATEGORY_FAMILIES)[number];

export const mechanicCategoryFamilySchema = z.enum(MECHANIC_CATEGORY_FAMILIES);

const mechanicCategorySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    coreKey: z.string().min(1).optional(),
    family: mechanicCategoryFamilySchema.optional(),
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

export const RETIRED_LEGACY_CORE_RULES: Record<string, { category: any; rule: any }> = {
  'core.stamina_cost.base': {
    category: { id: 'core.stamina_cost', coreKey: 'stamina_cost', name: 'Coste de Estamina' },
    rule: { id: 'core.stamina_cost.base', name: 'Coste de Estamina', cost: 0, ruleType: 'component', component: { kind: 'consequence', role: 'cost', when: 'activation', consequence: { kind: 'resource', resourceId: 'ES', amount: 1 } } }
  },
  'core.health_cost.base': {
    category: { id: 'core.health_cost', coreKey: 'health_cost', name: 'Coste de HP' },
    rule: { id: 'core.health_cost.base', name: 'Coste de HP', cost: 0, ruleType: 'component', component: { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'resource', resourceId: 'SA', amount: 1 } } }
  },
  'core.end_effect.int2': {
    category: { id: 'core.end_effect', coreKey: 'end_effect', name: 'Efecto al terminar' },
    rule: { id: 'core.end_effect.int2', name: 'Al terminar: −2 INT durante 3 turnos', cost: 0, ruleType: 'component', component: { kind: 'consequence', role: 'consequence', when: 'end', consequence: { kind: 'attribute', attributeId: 'INT', amount: -2, turns: 3 } } }
  },
  'core.per_turn_effect.hp1': {
    category: { id: 'core.per_turn_effect', coreKey: 'per_turn_effect', name: 'Efecto por turno' },
    rule: { id: 'core.per_turn_effect.hp1', name: '1 daño propio por turno', cost: 0, ruleType: 'component', component: { kind: 'consequence', role: 'consequence', when: 'each_turn', consequence: { kind: 'resource', resourceId: 'SA', amount: 1 } } }
  },
  'core.per_turn_effect.int2': {
    category: { id: 'core.per_turn_effect', coreKey: 'per_turn_effect', name: 'Efecto por turno' },
    rule: { id: 'core.per_turn_effect.int2', name: '−2 INT cada turno', cost: 0, ruleType: 'component', component: { kind: 'consequence', role: 'consequence', when: 'each_turn', consequence: { kind: 'attribute', attributeId: 'INT', amount: -2, turns: 1 } } }
  },
  'core.manual_resolution.unstable': {
    category: { id: 'core.manual_resolution', coreKey: 'manual_resolution', name: 'Resolución manual' },
    rule: { id: 'core.manual_resolution.unstable', name: 'Quirk inestable', cost: 0, ruleType: 'effect', effect: { timing: 'on_activation', type: 'manual_resolution', message: 'El quirk se activa de forma inestable. El Master determina el efecto.' } }
  },
  'core.temporary_penalty.des2': {
    category: { id: 'core.temporary_penalty', coreKey: 'temporary_penalty', name: 'Penalización temporal' },
    rule: { id: 'core.temporary_penalty.des2', name: '−2 DES mientras esté activo', cost: 0, ruleType: 'component', component: { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'attribute', attributeId: 'DES', amount: -2, turns: 2, untilEnd: true } } }
  },
  'core.consequence_status.stunned': {
    category: { id: 'core.consequence_status', coreKey: 'consequence_status', name: 'Estado como consecuencia' },
    rule: { id: 'core.consequence_status.stunned', name: 'Aturdido 1 turno', cost: 0, ruleType: 'component', component: { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'status', statusElementId: 'core.status.stunned', turns: 1 } } }
  },
  'core.caps.ce': {
    category: { id: 'core.caps', coreKey: 'caps', name: 'Límites / caps' },
    rule: { id: 'core.caps.ce', name: 'CE entre 0 y 100 (editable)', cost: 0, ruleType: 'component', component: { kind: 'cap', subject: 'stamina_cost', min: 0, max: 100 } }
  },
  'core.healing.es2': {
    category: { id: 'core.healing', coreKey: 'healing', name: 'Curación' },
    rule: { id: 'core.healing.es2', name: 'Curar 2 ES', cost: 1, ruleType: 'effect', effect: { timing: 'on_activation', type: 'healing', resourceId: 'ES', amount: 2, magnitude: { kind: 'fixed', amount: 2 } } }
  },
  'core.healing.hp10': {
    category: { id: 'core.healing', coreKey: 'healing', name: 'Curación' },
    rule: { id: 'core.healing.hp10', name: 'Curar 10 HP', cost: 6, ruleType: 'effect', effect: { timing: 'on_activation', type: 'healing', resourceId: 'SA', amount: 10, magnitude: { kind: 'fixed', amount: 10 } } }
  },
  'core.bonus.fue2': {
    category: { id: 'core.bonus', coreKey: 'bonus', name: 'Bono' },
    rule: { id: 'core.bonus.fue2', name: '+2 FUE', cost: 0, ruleType: 'effect', effect: { timing: 'on_activation', type: 'attribute_modifier', attributeId: 'FUE', amount: 2 } }
  },
  'core.penalty.int2': {
    category: { id: 'core.penalty', coreKey: 'penalty', name: 'Pena' },
    rule: { id: 'core.penalty.int2', name: '−2 INT', cost: 0, ruleType: 'effect', effect: { timing: 'on_activation', type: 'attribute_modifier', attributeId: 'INT', amount: -2 } }
  }
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
    const key = JSON.stringify([groupId, reference.mechanicId, reference.ruleId, reference.minLevel ?? 1]);
    if (seen.has(key) || applicationIds.has(reference.applicationId)) {
      issues.push({ ...reference, code: 'duplicate_mechanic_reference' });
      continue;
    }
    seen.add(key); applicationIds.add(reference.applicationId);
    let category = categories.find(c => c.id === reference.mechanicId);
    let rule = category?.rules.find(r => r.id === reference.ruleId);
    if (!category || !rule) {
      const legacy = RETIRED_LEGACY_CORE_RULES[reference.ruleId] || RETIRED_LEGACY_CORE_RULES[`${reference.mechanicId}.${reference.ruleId.split('.').pop()}`];
      if (legacy) {
        category = legacy.category;
        rule = legacy.rule;
      }
    }
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
